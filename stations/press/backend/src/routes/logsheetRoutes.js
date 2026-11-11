import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorizePermission } from '../middleware/jwtMiddleware.js';
import ExcelJS from 'exceljs';

const router = Router();
router.use(requireAuth);

// GET /api/press/logsheet
router.get('/', async (req, res) => {
  const { date, shift } = req.query;
  const params = [];
  let sql = 'SELECT * FROM logsheet_entries WHERE 1=1';
  if (date)  { sql += ' AND log_date=?'; params.push(date); }
  if (shift) { sql += ' AND shift=?';    params.push(shift); }
  sql += ' ORDER BY log_date DESC, created_at DESC LIMIT 100';

  try {
    const [rows] = await dbPool.query(sql, params);
    const parsedRows = rows.map(r => ({
      ...r,
      data_json: typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json
    }));
    res.json({ success: true, data: parsedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/press/logsheet/hourly
router.get('/hourly', async (req, res) => {
  const { date } = req.query; 
  if (!date) return res.status(400).json({ success: false, error: "Date is required" });

  try {
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);
    
    const startTimeStr = `${date} 07:00:00`;
    const endTimeStr = `${nextDate.toISOString().split('T')[0]} 07:59:59`;

    const [rows] = await dbPool.query(`
      SELECT 
        DATE_FORMAT(tv.timestamp, '%Y-%m-%d %H:00:00') as hour_block,
        t.tag_name,
        AVG(tv.value) as avg_value
      FROM plc_tag_values tv
      JOIN plc_tags t ON tv.tag_id = t.id
      WHERE tv.timestamp >= ? AND tv.timestamp <= ?
      GROUP BY hour_block, t.tag_name
    `, [startTimeStr, endTimeStr]);

    const hourlyData = {};
    rows.forEach(r => {
      if (!hourlyData[r.hour_block]) hourlyData[r.hour_block] = {};
      hourlyData[r.hour_block][r.tag_name] = r.avg_value;
    });

    res.json({ success: true, data: hourlyData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/press/logsheet
router.post('/', authorizePermission('logsheet_input'), async (req, res) => {
  const { shift, log_date, data_json, notes } = req.body;
  try {
    const [r] = await dbPool.query(
      'INSERT INTO logsheet_entries (shift,log_date,operator_id,operator_name,data_json,notes) VALUES (?,?,?,?,?,?)',
      [shift, log_date, req.user.userId, req.user.username, JSON.stringify(data_json), notes]
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/press/logsheet/:id
router.put('/:id', authorizePermission('logsheet_input'), async (req, res) => {
  const { data_json, notes } = req.body;
  try {
    await dbPool.query(
      'UPDATE logsheet_entries SET data_json=?, notes=? WHERE id=?',
      [JSON.stringify(data_json), notes, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/press/logsheet/export-excel
router.get('/export-excel', async (req, res) => {
  const { date } = req.query;
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Logsheet Pressing');

    sheet.mergeCells('A1:X1');
    sheet.getCell('A1').value = 'AGROVISION INDUSTRIAL MILL';
    sheet.getCell('A1').font = { bold: true };
    sheet.mergeCells('A2:X2');
    sheet.getCell('A2').value = 'PMKS. AGROVISION DEMO MILL';
    sheet.getCell('A2').font = { bold: true };

    sheet.mergeCells('A4:X4');
    sheet.getCell('A4').value = 'LOGSHEET PRESSING';
    sheet.getCell('A4').alignment = { horizontal: 'center' };
    sheet.getCell('A4').font = { bold: true, size: 14 };

    sheet.getCell('A6').value = 'Tanggal: ' + date;

    // Headers Row 8
    const row8 = sheet.getRow(8);
    row8.getCell(1).value = 'Jam';
    let c = 2;
    for(let i=1; i<=4; i++) {
        sheet.mergeCells(8, c, 8, c+2);
        row8.getCell(c).value = `Press no. ${i}`;
        row8.getCell(c).alignment = { horizontal: 'center' };
        c+=3;
    }
    for(let i=1; i<=4; i++) {
        sheet.mergeCells(8, c, 8, c+2);
        row8.getCell(c).value = `Digester no. ${i}`;
        row8.getCell(c).alignment = { horizontal: 'center' };
        c+=3;
    }
    row8.getCell(c).value = 'COT Temp';

    // Headers Row 9
    const row9 = sheet.getRow(9);
    c = 2;
    for(let i=1; i<=4; i++) {
        row9.getCell(c++).value = 'Amp (A)';
        row9.getCell(c++).value = 'Hid Press (Kg/cm2)';
        row9.getCell(c++).value = 'Cone Load (A)';
    }
    for(let i=1; i<=4; i++) {
        row9.getCell(c++).value = 'Amp';
        row9.getCell(c++).value = 'Isi';
        row9.getCell(c++).value = 'Temp (°C)';
    }
    row9.getCell(c).value = 'Temp (°C)';

    // Formatting Headers
    for(let i=1; i<=26; i++) {
      row8.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      row9.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      row8.getCell(i).font = { bold: true, size: 9 };
      row9.getCell(i).font = { bold: true, size: 9 };
      row9.getCell(i).alignment = { horizontal: 'center' };
    }

    // Fetch Hourly Data
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);
    const startTimeStr = `${date} 07:00:00`;
    const endTimeStr = `${nextDate.toISOString().split('T')[0]} 07:59:59`;

    const [rows] = await dbPool.query(`
      SELECT DATE_FORMAT(tv.timestamp, '%Y-%m-%d %H:00:00') as hour_block, t.tag_name, AVG(tv.value) as avg_value
      FROM plc_tag_values tv 
      JOIN plc_tags t ON tv.tag_id = t.id
      WHERE tv.timestamp >= ? AND tv.timestamp <= ? GROUP BY hour_block, t.tag_name
    `, [startTimeStr, endTimeStr]);
    const hourlyData = {};
    rows.forEach(r => {
      if (!hourlyData[r.hour_block]) hourlyData[r.hour_block] = {};
      hourlyData[r.hour_block][r.tag_name] = r.avg_value;
    });

    const getVal = (hr, tag) => {
      let d = new Date(date);
      const h = parseInt(hr.split(':')[0]);
      if (h < 7) d.setDate(d.getDate() + 1);
      const ts = `${d.toISOString().split('T')[0]} ${hr}:00`;
      return (hourlyData[ts] && hourlyData[ts][tag] !== undefined) ? Number(hourlyData[ts][tag]).toFixed(1) : '';
    };

    const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00','01:00','02:00','03:00','04:00','05:00','06:00'];
    
    let currRow = 10;
    HOURS.forEach(hr => {
      const row = sheet.getRow(currRow);
      row.getCell(1).value = hr;
      let cc = 2;
      for(let i=1; i<=4; i++) {
        row.getCell(cc++).value = getVal(hr, `PRESS${i}_AMP`);
        row.getCell(cc++).value = getVal(hr, `PRESS${i}_HL`);
        row.getCell(cc++).value = getVal(hr, `PRESS${i}_%`);
      }
      for(let i=1; i<=4; i++) {
        row.getCell(cc++).value = getVal(hr, `DIG${i}_AMP`);
        row.getCell(cc++).value = getVal(hr, `DIG${i}_%`);
        row.getCell(cc++).value = getVal(hr, `DIG${i}_TEMP`);
      }
      row.getCell(cc).value = getVal(hr, 'COT_TEMP');

      for(let i=1; i<=26; i++) {
        row.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        row.getCell(i).alignment = { horizontal: 'center' };
      }
      currRow++;
    });

    sheet.getColumn(1).width = 8;
    for(let i=2; i<=26; i++) {
      sheet.getColumn(i).width = 12;
    }

    // Manual Data Section
    const [manualRows] = await dbPool.query('SELECT data_json, notes FROM logsheet_entries WHERE log_date = ? ORDER BY created_at DESC LIMIT 1', [date]);
    const manualData = manualRows.length > 0 ? (typeof manualRows[0].data_json === 'string' ? JSON.parse(manualRows[0].data_json) : manualRows[0].data_json) : {};
    const notes = manualRows.length > 0 ? manualRows[0].notes : '';
    const pData = manualData.press || {};
    const dData = manualData.digester || {};
    const mData = manualData.mesin || {};

    currRow += 2;
    
    // --- Headers Row 1 ---
    const bh1 = sheet.getRow(currRow);
    
    // Press
    sheet.mergeCells(currRow, 1, currRow+1, 1);
    bh1.getCell(1).value = 'Press No';
    sheet.mergeCells(currRow, 2, currRow, 3);
    bh1.getCell(2).value = 'Operational Hour';
    sheet.mergeCells(currRow, 4, currRow+1, 4);
    bh1.getCell(4).value = 'Wormscrew\n(Rpm)';
    sheet.mergeCells(currRow, 5, currRow, 7);
    bh1.getCell(5).value = 'HM';
    
    // Catatan
    sheet.mergeCells(currRow, 8, currRow+10, 13);
    bh1.getCell(8).value = 'Catatan: \n' + notes;
    bh1.getCell(8).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    bh1.getCell(8).border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
    
    // Digester
    sheet.mergeCells(currRow, 14, currRow+1, 14);
    bh1.getCell(14).value = 'Digester No';
    sheet.mergeCells(currRow, 15, currRow, 17);
    bh1.getCell(15).value = 'Operational Hour';
    sheet.mergeCells(currRow, 18, currRow, 20);
    bh1.getCell(18).value = 'HM';
    
    // --- Headers Row 2 ---
    const bh2 = sheet.getRow(currRow + 1);
    
    // Press Subheaders
    bh2.getCell(2).value = 'Start Jam';
    bh2.getCell(3).value = 'Stop Jam';
    bh2.getCell(5).value = 'Hari ini';
    bh2.getCell(6).value = 'S/D Hari ini';
    bh2.getCell(7).value = 'Total';

    // Digester Subheaders
    bh2.getCell(15).value = 'Start Jam';
    bh2.getCell(16).value = 'Stop Jam';
    bh2.getCell(17).value = 'Total';
    bh2.getCell(18).value = 'Hari ini';
    bh2.getCell(19).value = 'S/D Hari ini';
    bh2.getCell(20).value = 'Total';

    // Apply Borders and Styling to Headers
    for(let i of [1,2,3,4,5,6,7, 14,15,16,17,18,19,20]) {
      bh1.getCell(i).border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
      bh1.getCell(i).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      bh1.getCell(i).font = { bold: true, size: 9 };
      bh2.getCell(i).border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
      bh2.getCell(i).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      bh2.getCell(i).font = { bold: true, size: 9 };
    }

    currRow += 2;
    // --- Data Rows for Press and Digester (4 rows) ---
    for(let i=1; i<=4; i++) {
      const row = sheet.getRow(currRow);
      // Press Data
      row.getCell(1).value = i;
      row.getCell(2).value = pData[i]?.start||'';
      row.getCell(3).value = pData[i]?.stop||'';
      row.getCell(4).value = pData[i]?.rpm||'';
      row.getCell(5).value = pData[i]?.hm_hari||'';
      row.getCell(6).value = pData[i]?.hm_sd||'';
      row.getCell(7).value = pData[i]?.hm_total||'';

      // Digester Data
      row.getCell(14).value = i;
      row.getCell(15).value = dData[i]?.start||'';
      row.getCell(16).value = dData[i]?.stop||'';
      row.getCell(17).value = dData[i]?.total||'';
      row.getCell(18).value = dData[i]?.hm_hari||'';
      row.getCell(19).value = dData[i]?.hm_sd||'';
      row.getCell(20).value = dData[i]?.hm_total||'';

      for(let j of [1,2,3,4,5,6,7, 14,15,16,17,18,19,20]) {
        row.getCell(j).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        row.getCell(j).alignment = { horizontal: 'center' };
        row.getCell(j).font = { bold: true, size: 9 };
      }
      currRow++;
    }

    // --- Mesin Headers ---
    const mh1 = sheet.getRow(currRow);
    mh1.getCell(1).value = 'Mesin';
    mh1.getCell(2).value = 'Start Jam';
    mh1.getCell(3).value = 'Stop Jam';
    mh1.getCell(4).value = 'Total';
    mh1.getCell(5).value = 'Operational';
    mh1.getCell(6).value = 'Stop Jam';
    mh1.getCell(7).value = 'Total';

    for(let i of [1,2,3,4,5,6,7]) {
      mh1.getCell(i).border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
      mh1.getCell(i).alignment = { horizontal: 'center', vertical: 'middle' };
      mh1.getCell(i).font = { bold: true, size: 9 };
    }
    
    currRow++;
    // --- Mesin Rows (2 rows) ---
    const mesins = ['CBC 1', 'CBC 2'];
    for(let i=0; i<2; i++) {
      const row = sheet.getRow(currRow);
      let mName = mesins[i];
      let vName = `V.Screen ${i+1}`;
      row.getCell(1).value = mName;
      row.getCell(2).value = mData[mName]?.start||'';
      row.getCell(3).value = mName === 'CBC 1' ? mData['CBC 1']?.stop||'' : mData['CBC 2']?.stop||'';
      row.getCell(4).value = mData[mName]?.total||'';
      row.getCell(5).value = vName;
      row.getCell(6).value = mData[vName]?.vstop||'';
      row.getCell(7).value = mData[vName]?.vtotal||'';

      for(let j of [1,2,3,4,5,6,7]) {
        row.getCell(j).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        row.getCell(j).alignment = { horizontal: 'center' };
        row.getCell(j).font = { bold: true, size: 9 };
      }
      currRow++;
    }

    // --- Signatures Section ---
    // Align with Digester block (Col 14-25)
    // Signatures are located below the Digester table
    const sigRowTitle = sheet.getRow(currRow);
    sigRowTitle.getCell(14).value = 'Dibuat Oleh,';
    sigRowTitle.getCell(19).value = 'Diperiksa Oleh,';
    sigRowTitle.getCell(24).value = 'Diketahui Oleh,';
    
    for(let j of [14, 19, 24]) {
      sigRowTitle.getCell(j).font = { bold: true, size: 9 };
      sigRowTitle.getCell(j).alignment = { horizontal: 'center' };
    }
    
    currRow += 4; // Leave space for signatures
    
    const sigRowNames = sheet.getRow(currRow);
    // Dibuat Oleh (Op Shift I & II)
    sheet.mergeCells(currRow, 14, currRow, 15);
    sigRowNames.getCell(14).value = 'Op Shift I          Op Shift II';
    sigRowNames.getCell(14).border = { top: {style:'thin'} };
    sigRowNames.getCell(14).alignment = { horizontal: 'center' };
    sigRowNames.getCell(14).font = { bold: true, size: 9 };

    // Diperiksa Oleh (Asisten/Mandor)
    sheet.mergeCells(currRow, 19, currRow, 21);
    sigRowNames.getCell(19).value = 'Asisten/Mandor';
    sigRowNames.getCell(19).border = { top: {style:'thin'} };
    sigRowNames.getCell(19).alignment = { horizontal: 'center' };
    sigRowNames.getCell(19).font = { bold: true, size: 9 };

    // Diketahui Oleh (Mill Manager)
    sheet.mergeCells(currRow, 24, currRow, 25);
    sigRowNames.getCell(24).value = 'Mill Manager';
    sigRowNames.getCell(24).border = { top: {style:'thin'} };
    sigRowNames.getCell(24).alignment = { horizontal: 'center' };
    sigRowNames.getCell(24).font = { bold: true, size: 9 };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Logsheet_Pressing_${date}.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error exporting Excel: " + err.message);
  }
});

export default router;
