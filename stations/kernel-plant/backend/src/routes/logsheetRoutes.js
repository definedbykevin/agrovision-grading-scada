import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorizePermission } from '../middleware/jwtMiddleware.js';
import ExcelJS from 'exceljs';

const router = Router();
router.use(requireAuth);

const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00','01:00','02:00','03:00','04:00','05:00','06:00'];
const RIPPLE_MILLS = [1, 2, 3, 4, 5];
const NUT_SILOS = [1, 2, 3];
const KERNEL_SILOS = [1, 2, 3];

router.get('/hourly', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Date is required' });

  try {
    let targetDate = new Date(date);
    let endTargetDate = new Date(date);
    endTargetDate.setDate(endTargetDate.getDate() + 1);

    const [rows] = await dbPool.query(
      `SELECT tv.timestamp, t.tag_name, tv.value 
       FROM plc_tag_values tv
       JOIN plc_tags t ON tv.tag_id = t.id
       WHERE tv.timestamp >= ? AND tv.timestamp <= ? 
       ORDER BY tv.timestamp ASC`,
      [
        `${targetDate.toISOString().split('T')[0]} 07:00:00`,
        `${endTargetDate.toISOString().split('T')[0]} 06:59:59`
      ]
    );

    const hourlyData = {};
    rows.forEach(r => {
      const dt = new Date(r.timestamp);
      dt.setMinutes(0, 0, 0); 
      const datePart = dt.toISOString().split('T')[0];
      const hourPart = String(dt.getHours()).padStart(2, '0') + ':00';
      const key = `${datePart} ${hourPart}`;
      
      if (!hourlyData[key]) hourlyData[key] = {};
      hourlyData[key][r.tag_name] = r.value; 
    });

    res.json({ success: true, data: hourlyData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', async (req, res) => {
  const { date } = req.query;
  const params = [];
  let sql = 'SELECT * FROM logsheet_entries WHERE 1=1';
  if (date)  { sql += ' AND log_date=?'; params.push(date); }
  sql += ' ORDER BY log_date DESC, created_at DESC LIMIT 1';

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

router.post('/', authorizePermission('logsheet_input'), async (req, res) => {
  const { log_date, data_json, notes } = req.body;
  try {
    const [existing] = await dbPool.query('SELECT id FROM logsheet_entries WHERE log_date=?', [log_date]);
    if (existing.length > 0) {
      await dbPool.query(
        'UPDATE logsheet_entries SET data_json=?, notes=?, operator_id=?, operator_name=? WHERE id=?',
        [JSON.stringify(data_json), notes, req.user.userId, req.user.username, existing[0].id]
      );
      return res.json({ success: true, id: existing[0].id });
    }

    const [r] = await dbPool.query(
      'INSERT INTO logsheet_entries (shift,log_date,operator_id,operator_name,data_json,notes) VALUES (?,?,?,?,?,?)',
      [1, log_date, req.user.userId, req.user.username, JSON.stringify(data_json), notes]
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export-excel', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).send("Date is required");

  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('LOGSHEET_KERNEL', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
    });

    const borderAll = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    const fontBold = { bold: true, name: 'Arial', size: 10 };
    const fontNormal = { name: 'Arial', size: 10 };
    const alignCenter = { vertical: 'middle', horizontal: 'center', wrapText: true };
    const alignLeft = { vertical: 'middle', horizontal: 'left', wrapText: true };

    sheet.getColumn(1).width = 8; 
    for(let c=2; c<=14; c++) sheet.getColumn(c).width = 7.5;
    for(let c=15; c<=23; c++) sheet.getColumn(c).width = 9.5;
    sheet.getColumn(24).width = 15;
    sheet.getColumn(25).width = 12;
    sheet.getColumn(26).width = 12;
    sheet.getColumn(27).width = 12;

    sheet.getCell('A1').value = 'AGROVISION INDUSTRIAL MILL';
    sheet.getCell('A1').font = fontBold;
    sheet.getCell('A2').value = 'PMKS. AGROVISION DEMO MILL';
    sheet.getCell('A2').font = fontBold;
    sheet.mergeCells('A1:J1');
    sheet.mergeCells('A2:J2');

    sheet.getCell('O1').value = 'LOGSHEET KERNEL RECOVERY';
    sheet.getCell('O1').font = { bold: true, size: 14, name: 'Arial' };
    sheet.getCell('O1').alignment = alignCenter;
    sheet.mergeCells('O1:AA2');

    sheet.getCell('A4').value = 'HARI';
    sheet.getCell('D4').value = 'TANGGAL';
    sheet.getCell('E4').value = `: ${date}`;

    const row6 = sheet.getRow(6);
    const row7 = sheet.getRow(7);
    const row8 = sheet.getRow(8);

    row6.getCell(1).value = 'JAM';
    sheet.mergeCells('A6:A8');
    
    let cc = 2;
    row6.getCell(cc).value = 'EFFICIENCY RIPPLE MILL';
    sheet.mergeCells(6, cc, 6, cc + RIPPLE_MILLS.length - 1);
    RIPPLE_MILLS.forEach(n => {
      row7.getCell(cc).value = `NO.${n}`;
      sheet.mergeCells(7, cc, 8, cc);
      cc++;
    });

    row6.getCell(cc).value = 'LEVEL NUT SILO';
    sheet.mergeCells(6, cc, 6, cc + NUT_SILOS.length - 1);
    NUT_SILOS.forEach(n => {
      row7.getCell(cc).value = `${n}`;
      sheet.mergeCells(7, cc, 8, cc);
      cc++;
    });

    row6.getCell(cc).value = 'LEVEL KERNEL SILO';
    sheet.mergeCells(6, cc, 6, cc + KERNEL_SILOS.length - 1);
    KERNEL_SILOS.forEach(n => {
      row7.getCell(cc).value = `${n}`;
      sheet.mergeCells(7, cc, 8, cc);
      cc++;
    });

    row6.getCell(cc).value = 'TEMPERATUR (°C) KERNEL SILO';
    sheet.mergeCells(6, cc, 6, cc + (KERNEL_SILOS.length * 3) - 1);
    KERNEL_SILOS.forEach(n => {
      row7.getCell(cc).value = `SILO ${n}`;
      sheet.mergeCells(7, cc, 7, cc + 2);
      row8.getCell(cc).value = 'A 100°C';
      row8.getCell(cc+1).value = 'T 60°C';
      row8.getCell(cc+2).value = 'B 40°C';
      cc += 3;
    });

    row6.getCell(cc).value = 'Pengiriman Kernel ke bungkil silo (kirim/tidak)';
    sheet.mergeCells(6, cc, 8, cc);
    cc++;

    row6.getCell(cc).value = 'FIBER Cyclone (A)';
    sheet.mergeCells(6, cc, 8, cc);
    cc++;

    row6.getCell(cc).value = 'LTDS 1 Fan (A)';
    sheet.mergeCells(6, cc, 8, cc);
    cc++;

    row6.getCell(cc).value = 'LTDS 2 Fan (A)';
    sheet.mergeCells(6, cc, 8, cc);

    let targetDate = new Date(date);
    let endTargetDate = new Date(date);
    endTargetDate.setDate(endTargetDate.getDate() + 1);
    const [hourlyRows] = await dbPool.query(
      `SELECT tv.timestamp, t.tag_name, tv.value 
       FROM plc_tag_values tv
       JOIN plc_tags t ON tv.tag_id = t.id
       WHERE tv.timestamp >= ? AND tv.timestamp <= ? 
       ORDER BY tv.timestamp ASC`,
      [`${targetDate.toISOString().split('T')[0]} 07:00:00`, `${endTargetDate.toISOString().split('T')[0]} 06:59:59`]
    );

    const hourlyData = {};
    hourlyRows.forEach(r => {
      const dt = new Date(r.timestamp);
      dt.setMinutes(0, 0, 0);
      const datePart = dt.toISOString().split('T')[0];
      const hourPart = String(dt.getHours()).padStart(2, '0') + ':00';
      const key = `${datePart} ${hourPart}`;
      if (!hourlyData[key]) hourlyData[key] = {};
      hourlyData[key][r.tag_name] = r.value;
    });

    const getVal = (hr, tag) => {
      const parsedHr = parseInt(hr.split(':')[0]);
      let dt = new Date(date);
      if (parsedHr < 7) dt.setDate(dt.getDate() + 1);
      const key = `${dt.toISOString().split('T')[0]} ${hr}:00`;
      return hourlyData[key] && hourlyData[key][tag] !== undefined ? Number(hourlyData[key][tag]).toFixed(1) : '';
    };

    let startRow = 9;
    HOURS.forEach(hr => {
      const row = sheet.getRow(startRow);
      row.getCell(1).value = hr;
      let c = 2;
      RIPPLE_MILLS.forEach(n => { row.getCell(c++).value = getVal(hr, `RIP${n}_EFF`); });
      NUT_SILOS.forEach(n => { row.getCell(c++).value = getVal(hr, `NS${n}_LEVEL`); });
      KERNEL_SILOS.forEach(n => { row.getCell(c++).value = getVal(hr, `KS${n}_LEVEL`); });
      KERNEL_SILOS.forEach(n => { 
        row.getCell(c++).value = getVal(hr, `KS${n}_TEMP_A`); 
        row.getCell(c++).value = getVal(hr, `KS${n}_TEMP_T`); 
        row.getCell(c++).value = getVal(hr, `KS${n}_TEMP_B`); 
      });
      row.getCell(c++).value = getVal(hr, 'KERNEL_PENGIRIMAN');
      row.getCell(c++).value = getVal(hr, 'FIB_CYC_AMP');
      row.getCell(c++).value = getVal(hr, 'LTDS1_AMP');
      row.getCell(c++).value = getVal(hr, 'LTDS2_AMP');
      startRow++;
    });

    let manualData = { losses_wet: '', losses_dry: '', dirt_feed: '', calcium: '', machines: {} };
    let notes = '';
    const [manualRows] = await dbPool.query('SELECT * FROM logsheet_entries WHERE log_date=? ORDER BY id DESC LIMIT 1', [date]);
    if (manualRows.length > 0) {
      notes = manualRows[0].notes || '';
      try { manualData = JSON.parse(manualRows[0].data_json); } catch(e){}
    }
    const mach = manualData.machines || {};

    startRow += 2; // Spacing

    sheet.getCell(`B${startRow}`).value = 'LOSSES';
    sheet.mergeCells(`B${startRow}:E${startRow}`);
    
    sheet.getCell(`F${startRow}`).value = 'DIRT FEED KERNEL SILO (%)';
    sheet.mergeCells(`F${startRow}:J${startRow}`);
    
    sheet.getCell(`K${startRow}`).value = 'PEMAKAIAN CALSIUM (Kg)';
    sheet.mergeCells(`K${startRow}:N${startRow}`);

    sheet.getCell(`O${startRow}`).value = 'KETERANGAN';
    sheet.mergeCells(`O${startRow}:AA${startRow}`);

    sheet.getCell(`B${startRow+1}`).value = 'Wet Shell (%)';
    sheet.mergeCells(`B${startRow+1}:C${startRow+1}`);
    sheet.getCell(`D${startRow+1}`).value = manualData.losses_wet || '';
    sheet.mergeCells(`D${startRow+1}:E${startRow+1}`);

    sheet.getCell(`F${startRow+1}`).value = manualData.dirt_feed || '';
    sheet.mergeCells(`F${startRow+1}:J${startRow+2}`);

    sheet.getCell(`K${startRow+1}`).value = manualData.calcium || '';
    sheet.mergeCells(`K${startRow+1}:N${startRow+2}`);

    sheet.getCell(`O${startRow+1}`).value = notes;
    sheet.mergeCells(`O${startRow+1}:AA${startRow+2}`);

    sheet.getCell(`B${startRow+2}`).value = 'Dry Shell (%)';
    sheet.mergeCells(`B${startRow+2}:C${startRow+2}`);
    sheet.getCell(`D${startRow+2}`).value = manualData.losses_dry || '';
    sheet.mergeCells(`D${startRow+2}:E${startRow+2}`);

    startRow += 3; // Row 38

    const leftMachines = [
      { id: 'rip1', name: 'Ripple Mill 1' },
      { id: 'rip2', name: 'Ripple Mill 2' },
      { id: 'rip3', name: 'Ripple Mill 3' },
      { id: 'ltds1', name: 'LTDS 1' },
      { id: 'ltds2', name: 'LTDS 2' }
    ];

    // Left Table Header
    sheet.getCell(`A${startRow}`).value = 'Mesin';
    sheet.mergeCells(`A${startRow}:A${startRow+1}`);
    
    sheet.getCell(`B${startRow}`).value = 'Operational Hour';
    sheet.mergeCells(`B${startRow}:D${startRow}`);
    
    sheet.getCell(`E${startRow}`).value = 'HM';
    sheet.mergeCells(`E${startRow}:G${startRow}`);

    sheet.getCell(`B${startRow+1}`).value = 'Start Jam';
    sheet.getCell(`C${startRow+1}`).value = 'Stop Jam';
    sheet.getCell(`D${startRow+1}`).value = 'Total';
    
    sheet.getCell(`E${startRow+1}`).value = 'Hari Ini';
    sheet.getCell(`F${startRow+1}`).value = 'S/D Hari Ini';
    sheet.getCell(`G${startRow+1}`).value = 'Total';

    // Fiber Cyclone Header (Right)
    sheet.getCell(`T${startRow}`).value = 'Mesin';
    sheet.mergeCells(`T${startRow}:U${startRow}`);
    sheet.getCell(`V${startRow}`).value = 'Operational Hour';
    sheet.mergeCells(`V${startRow}:AA${startRow}`);

    sheet.getCell(`T${startRow+1}`).value = 'Fiber Cyclone';
    sheet.mergeCells(`T${startRow+1}:U${startRow+1}`);
    sheet.getCell(`V${startRow+1}`).value = 'Start Jam';
    sheet.mergeCells(`V${startRow+1}:W${startRow+1}`);
    sheet.getCell(`X${startRow+1}`).value = 'Stop Jam';
    sheet.mergeCells(`X${startRow+1}:Y${startRow+1}`);
    sheet.getCell(`Z${startRow+1}`).value = 'Total';
    sheet.mergeCells(`Z${startRow+1}:AA${startRow+1}`);

    // Catatan
    sheet.getCell(`I${startRow}`).value = 'Catatan :\n' + notes;
    sheet.mergeCells(`I${startRow}:M${startRow+6}`); // I38:M44

    let rowIdx = startRow + 2; // Row 40

    // Fill Left Machines (Row 40 to 44)
    leftMachines.forEach(m => {
      sheet.getCell(`A${rowIdx}`).value = m.name;
      sheet.getCell(`B${rowIdx}`).value = mach[m.id]?.start || '';
      sheet.getCell(`C${rowIdx}`).value = mach[m.id]?.stop || '';
      sheet.getCell(`D${rowIdx}`).value = mach[m.id]?.total || '';
      sheet.getCell(`E${rowIdx}`).value = mach[m.id]?.hm_hari || '';
      sheet.getCell(`F${rowIdx}`).value = mach[m.id]?.hm_sd || '';
      sheet.getCell(`G${rowIdx}`).value = mach[m.id]?.hm_tot || '';
      rowIdx++;
    });

    // Fill Fiber Cyclone (Row 40)
    const fcRow = startRow + 2;
    sheet.getCell(`T${fcRow}`).value = ''; // empty under fiber cyclone name
    sheet.mergeCells(`T${fcRow}:U${fcRow}`);
    sheet.getCell(`V${fcRow}`).value = mach['fiber_cyclone']?.start || '';
    sheet.mergeCells(`V${fcRow}:W${fcRow}`);
    sheet.getCell(`X${fcRow}`).value = mach['fiber_cyclone']?.stop || '';
    sheet.mergeCells(`X${fcRow}:Y${fcRow}`);
    sheet.getCell(`Z${fcRow}`).value = mach['fiber_cyclone']?.total || '';
    sheet.mergeCells(`Z${fcRow}:AA${fcRow}`);

    // Signatures
    const sigRow = startRow + 5; // Row 43
    sheet.getCell(`O${sigRow}`).value = 'Dibuat Oleh,';
    sheet.mergeCells(`O${sigRow}:R${sigRow}`);
    
    sheet.getCell(`T${sigRow}`).value = 'Diperiksa Oleh,';
    sheet.mergeCells(`T${sigRow}:V${sigRow}`);
    
    sheet.getCell(`X${sigRow}`).value = 'Diketahui Oleh,';
    sheet.mergeCells(`X${sigRow}:AA${sigRow}`);
    
    sheet.getCell(`O${sigRow+4}`).value = 'Op Shift I';
    sheet.mergeCells(`O${sigRow+4}:P${sigRow+4}`);

    sheet.getCell(`Q${sigRow+4}`).value = 'Op Shift II';
    sheet.mergeCells(`Q${sigRow+4}:R${sigRow+4}`);

    sheet.getCell(`T${sigRow+4}`).value = 'Assisten / Mandore';
    sheet.mergeCells(`T${sigRow+4}:V${sigRow+4}`);

    sheet.getCell(`X${sigRow+4}`).value = 'Mill Manager';
    sheet.mergeCells(`X${sigRow+4}:AA${sigRow+4}`);

    // Apply styles SAFELY after all values and merges are done
    sheet.eachRow((row, rowNumber) => {
      for(let i = 1; i <= 27; i++) {
        const cell = row.getCell(i);
        
        if (rowNumber >= 6) {
          // Headers & Hourly
          if (rowNumber < 35) {
             if (rowNumber !== 33 && rowNumber !== 34) {
                cell.border = borderAll;
             }
          }
          // Losses block
          else if (rowNumber >= 35 && rowNumber <= 37) {
             if (i <= 14) cell.border = borderAll; // B to N only
             else if (i >= 15 && rowNumber === 35) cell.border = borderAll; // Keterangan header
             else if (i >= 15 && rowNumber >= 36) cell.border = borderAll; // Keterangan body
          }
          // Machine tables
          else if (rowNumber >= startRow && rowNumber <= startRow + 6) {
             // Left table (A-G)
             if (i >= 1 && i <= 7) cell.border = borderAll;
             // Right table (T-AA, only rows 38-40)
             if (rowNumber <= startRow + 2 && i >= 20 && i <= 27) cell.border = borderAll;
          }
          
          // Signature lines
          if (rowNumber === sigRow + 4) {
             if (i >= 15 && i <= 18) cell.border = { top: {style:'thin'} }; // Op Shift
             if (i >= 20 && i <= 22) cell.border = { top: {style:'thin'} }; // Assisten
             if (i >= 24 && i <= 27) cell.border = { top: {style:'thin'} }; // Manager
          }
        }
        
        // Alignment
        if (rowNumber === 11 || rowNumber === 14 || rowNumber === 15) {
           if (i >= 15) cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
           else cell.alignment = alignCenter;
        } else if (rowNumber >= startRow && rowNumber <= startRow + 6 && i >= 9 && i <= 13) {
           // Catatan
           cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        } else {
           cell.alignment = alignCenter;
        }

        // Font
        if (rowNumber <= 8) {
           cell.font = fontBold;
        } else if (rowNumber >= 35 && rowNumber <= 37) {
           if (i <= 5 && rowNumber > 35) cell.font = fontNormal;
           else cell.font = fontBold;
        } else if (rowNumber === startRow || rowNumber === startRow + 1) {
           cell.font = fontBold;
        } else if (rowNumber === sigRow) {
           cell.font = fontBold;
        } else {
           cell.font = fontNormal;
        }
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Logsheet_Kernel_Plant_${date}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
