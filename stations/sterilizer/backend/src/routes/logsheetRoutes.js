import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';
import ExcelJS from 'exceljs';

const router = Router();
router.use(requireAuth);

// GET /api/{station}/logsheet
router.get('/', async (req, res) => {
  const { date, limit = 100 } = req.query;
  const params = [];
  let sql = 'SELECT * FROM sterilizer_cycle_logs WHERE 1=1';
  
  if (date && date.trim() !== '') {
    const [y, m, d] = date.split('-').map(Number);
    const startDate = new Date(y, m - 1, d, 7, 0, 0);
    const endDate = new Date(y, m - 1, d + 1, 6, 59, 59);

    const formatDt = (dt) => {
      const yr = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const dy = String(dt.getDate()).padStart(2, '0');
      const hr = String(dt.getHours()).padStart(2, '0');
      const mi = String(dt.getMinutes()).padStart(2, '0');
      const se = String(dt.getSeconds()).padStart(2, '0');
      return `${yr}-${mo}-${dy} ${hr}:${mi}:${se}`;
    };

    const shiftStartStr = formatDt(startDate);
    const shiftEndStr = formatDt(endDate);

    sql += ' AND start_time >= ? AND start_time <= ?';
    params.push(shiftStartStr, shiftEndStr);
  }
  
  sql += ' ORDER BY start_time DESC LIMIT ?';
  params.push(parseInt(limit));

  try {
    const [rows] = await dbPool.query(sql, params);
    const parsedRows = rows.map(r => ({
      ...r,
      door_details: typeof r.door_details === 'string' ? JSON.parse(r.door_details) : r.door_details,
      step_details: typeof r.step_details === 'string' ? JSON.parse(r.step_details) : r.step_details,
      cycle_data: typeof r.cycle_data === 'string' ? JSON.parse(r.cycle_data) : r.cycle_data
    }));
    res.json({ success: true, data: parsedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/logsheet/export-excel
router.get('/export-excel', async (req, res) => {
  const { date } = req.query;
  const params = [];
  let sql = 'SELECT * FROM sterilizer_cycle_logs WHERE 1=1';
  
  if (date && date.trim() !== '') {
    const [y, m, d] = date.split('-').map(Number);
    const startDate = new Date(y, m - 1, d, 7, 0, 0);
    const endDate = new Date(y, m - 1, d + 1, 6, 59, 59);

    const formatDt = (dt) => {
      const yr = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const dy = String(dt.getDate()).padStart(2, '0');
      const hr = String(dt.getHours()).padStart(2, '0');
      const mi = String(dt.getMinutes()).padStart(2, '0');
      const se = String(dt.getSeconds()).padStart(2, '0');
      return `${yr}-${mo}-${dy} ${hr}:${mi}:${se}`;
    };

    const shiftStartStr = formatDt(startDate);
    const shiftEndStr = formatDt(endDate);

    sql += ' AND start_time >= ? AND start_time <= ?';
    params.push(shiftStartStr, shiftEndStr);
  }
  sql += ' ORDER BY start_time ASC';

  try {
    const [rows] = await dbPool.query(sql, params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KIP System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Logsheet & Score');

    // Header styling
    sheet.getCell('A1').value = 'AGROVISION INDUSTRIAL MILL';
    sheet.getCell('A1').font = { name: 'Arial', size: 10, bold: true };
    sheet.getCell('A2').value = 'PMKS. AGROVISION DEMO MILL';
    sheet.getCell('A2').font = { name: 'Arial', size: 10, bold: true };

    sheet.mergeCells('E2:K3');
    const titleCell = sheet.getCell('E2');
    titleCell.value = 'LOGSHEET & SCORE STERILLIZER';
    titleCell.font = { name: 'Arial', size: 14, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.getCell('A4').value = 'Hari      :';
    sheet.getCell('A5').value = `Tanggal : ${date || new Date().toISOString().split('T')[0]}`;
    sheet.getCell('D5').value = 'Shift :';

    // Set Columns Width
    sheet.columns = [
      { key: 'col1', width: 14 },
      { key: 'col2', width: 14 },
      { key: 'col3', width: 14 },
      { key: 'col4', width: 14 },
      { key: 'col5', width: 14 },
      { key: 'col6', width: 14 },
      { key: 'col7', width: 14 },
      { key: 'col8', width: 14 },
      { key: 'col9', width: 14 },
      { key: 'col10', width: 14 },
      { key: 'col11', width: 14 },
      { key: 'col12', width: 14 },
      { key: 'col13', width: 14 },
      { key: 'col14', width: 14 },
      { key: 'col15', width: 14 },
      { key: 'col16', width: 18 },
    ];

    const formatBorder = (cell) => {
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        cell.font = { name: 'Arial', size: 9 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    };

    // =========================================================
    // SECTION 1: LOGSHEET TABLE
    // =========================================================
    let currentRow = 6;
    
    // Header Logsheet
    const hRow1 = currentRow;
    const hRow2 = currentRow + 1;
    
    sheet.mergeCells(`A${hRow1}:A${hRow2}`); sheet.getCell(`A${hRow1}`).value = 'Nomor\nSterillizer';
    sheet.mergeCells(`B${hRow1}:B${hRow2}`); sheet.getCell(`B${hRow1}`).value = 'Siklus ke';
    sheet.mergeCells(`C${hRow1}:C${hRow2}`); sheet.getCell(`C${hRow1}`).value = 'Tutup Pintu\n0';
    sheet.mergeCells(`D${hRow1}:D${hRow2}`); sheet.getCell(`D${hRow1}`).value = 'Selesai Buang\nUdara\n1';
    
    sheet.mergeCells(`E${hRow1}:R${hRow1}`); sheet.getCell(`E${hRow1}`).value = 'WAKTU';
    sheet.getCell(`E${hRow2}`).value = 'Peak\nI\n2';
    sheet.getCell(`F${hRow2}`).value = 'Exhaust\nI\n3';
    sheet.getCell(`G${hRow2}`).value = 'Peak\nII\n4';
    sheet.getCell(`H${hRow2}`).value = 'Exhaust\nII\n5';
    sheet.getCell(`I${hRow2}`).value = 'Peak III\nStart\n6';
    sheet.getCell(`J${hRow2}`).value = 'Peak III\nStop\n7';
    sheet.getCell(`K${hRow2}`).value = 'Exhaust\nIII\n8';
    sheet.getCell(`L${hRow2}`).value = 'Holding\n2\n9';
    sheet.getCell(`M${hRow2}`).value = 'Blow\n2\n10';
    sheet.getCell(`N${hRow2}`).value = 'Holding\n3\n11';
    sheet.getCell(`O${hRow2}`).value = 'Blow\n3\n12';
    sheet.getCell(`P${hRow2}`).value = 'Holding\n4\n13';
    sheet.getCell(`Q${hRow2}`).value = 'Blow\ndown\n14';
    sheet.getCell(`R${hRow2}`).value = 'Exhaust\n\n15';

    sheet.mergeCells(`S${hRow1}:S${hRow2}`); sheet.getCell(`S${hRow1}`).value = 'Buka Pintu\n99';
    sheet.mergeCells(`T${hRow1}:T${hRow2}`); sheet.getCell(`T${hRow1}`).value = 'Dibawah\nSteam\nMenit';
    sheet.mergeCells(`U${hRow1}:U${hRow2}`); sheet.getCell(`U${hRow1}`).value = 'Total Waktu\nSiklus\nMenit';
    sheet.mergeCells(`V${hRow1}:V${hRow2}`); sheet.getCell(`V${hRow1}`).value = 'Paraf Mandor';
    sheet.mergeCells(`W${hRow1}:W${hRow2}`); sheet.getCell(`W${hRow1}`).value = 'Keterangan';

    const ALL_COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];
    ALL_COLS.forEach(col => {
      formatBorder(sheet.getCell(`${col}${hRow1}`));
      formatBorder(sheet.getCell(`${col}${hRow2}`));
    });
    sheet.getRow(hRow1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    sheet.getRow(hRow2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

    currentRow += 2;

    // Data Logsheet
    rows.forEach(r => {
      const door = typeof r.door_details === 'string' ? JSON.parse(r.door_details || '{}') : (r.door_details || {});
      const cdata = typeof r.cycle_data === 'string' ? JSON.parse(r.cycle_data || '{}') : (r.cycle_data || {});
      const dId = r.device_id;
      const getTemp = (t) => cdata[t] !== undefined ? cdata[t] : '-';
      const totalMenit = Math.round((new Date(r.end_time) - new Date(r.start_time)) / 60000) || 0;

      const stepDetails = typeof r.step_details === 'string' ? JSON.parse(r.step_details || '[]') : (r.step_details || []);
      const getDuration = (stepNum) => {
         const st = stepDetails.find(s => s.step === stepNum);
         if (!st || st.duration <= 0) return '-';
         return `${st.duration}s (${Math.floor(st.duration/60)}m)`;
      };

      sheet.getCell(`A${currentRow}`).value = dId;
      sheet.getCell(`B${currentRow}`).value = r.cycle_number;
      sheet.getCell(`C${currentRow}`).value = door.inlet?.duration ? `${door.inlet.duration}s (${Math.floor(door.inlet.duration/60)}m)` : '-';
      sheet.getCell(`D${currentRow}`).value = getDuration(1);
      sheet.getCell(`E${currentRow}`).value = getDuration(2);
      sheet.getCell(`F${currentRow}`).value = getDuration(3);
      sheet.getCell(`G${currentRow}`).value = getDuration(4);
      sheet.getCell(`H${currentRow}`).value = getDuration(5);
      sheet.getCell(`I${currentRow}`).value = getDuration(6);
      sheet.getCell(`J${currentRow}`).value = getDuration(7);
      sheet.getCell(`K${currentRow}`).value = getDuration(8);
      sheet.getCell(`L${currentRow}`).value = getDuration(9);
      sheet.getCell(`M${currentRow}`).value = getDuration(10);
      sheet.getCell(`N${currentRow}`).value = getDuration(11);
      sheet.getCell(`O${currentRow}`).value = getDuration(12);
      sheet.getCell(`P${currentRow}`).value = getDuration(13);
      sheet.getCell(`Q${currentRow}`).value = getDuration(14);
      sheet.getCell(`R${currentRow}`).value = getDuration(15);
      sheet.getCell(`S${currentRow}`).value = door.outlet?.duration ? `${door.outlet.duration}s (${Math.floor(door.outlet.duration/60)}m)` : '-';
      sheet.getCell(`T${currentRow}`).value = '-';
      sheet.getCell(`U${currentRow}`).value = totalMenit;
      sheet.getCell(`V${currentRow}`).value = '';
      sheet.getCell(`W${currentRow}`).value = '';

      const ALL_COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];
      ALL_COLS.forEach(col => formatBorder(sheet.getCell(`${col}${currentRow}`)));
      currentRow++;
    });

    if (rows.length < 15) {
      for(let i=rows.length; i<15; i++) {
        const ALL_COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];
        ALL_COLS.forEach(col => formatBorder(sheet.getCell(`${col}${currentRow}`)));
        currentRow++;
      }
    }

    // Tanda Tangan Logsheet
    const drawSignature = (startRow) => {
      sheet.getCell(`A${startRow}`).value = 'Catatan : ________________________________________';
      sheet.getCell(`A${startRow+1}`).value = '          ________________________________________';
      sheet.getCell(`A${startRow+2}`).value = '          ________________________________________';
      for (let i=0; i<3; i++) sheet.getCell(`A${startRow+i}`).font = { name: 'Arial', size: 9 };

      sheet.getCell(`E${startRow}`).value = 'Dibuat Oleh,';
      sheet.getCell(`J${startRow}`).value = 'Diperiksa Oleh,';
      sheet.getCell(`N${startRow}`).value = 'Diketahui Oleh,';
      
      sheet.getCell(`D${startRow+4}`).value = '___________________';
      sheet.getCell(`D${startRow+5}`).value = 'Op Shift I';
      
      sheet.getCell(`F${startRow+4}`).value = '___________________';
      sheet.getCell(`F${startRow+5}`).value = 'Op Shift II';
      
      sheet.getCell(`J${startRow+4}`).value = '___________________';
      sheet.getCell(`J${startRow+5}`).value = 'Assisten / Mandore';
      
      sheet.getCell(`N${startRow+4}`).value = '___________________';
      sheet.getCell(`N${startRow+5}`).value = 'Mill Manager';

      ['E','J','N'].forEach(col => { sheet.getCell(`${col}${startRow}`).alignment = { horizontal: 'center' }; sheet.getCell(`${col}${startRow}`).font = { name: 'Arial', size: 9 }; });
      ['D','F','J','N'].forEach(col => { 
        sheet.getCell(`${col}${startRow+4}`).alignment = { horizontal: 'center' }; sheet.getCell(`${col}${startRow+4}`).font = { name: 'Arial', size: 9 };
        sheet.getCell(`${col}${startRow+5}`).alignment = { horizontal: 'center' }; sheet.getCell(`${col}${startRow+5}`).font = { name: 'Arial', size: 9 };
      });
    };

    currentRow += 1;
    drawSignature(currentRow);
    currentRow += 8;

    // =========================================================
    // SECTION 2: SCORE SUMMARY TABLE
    // =========================================================
    
    sheet.mergeCells(`A${currentRow}:W${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = 'SUMMARY SCORE PER SIKLUS (0-100)';
    sheet.getCell(`A${currentRow}`).font = { name: 'Arial', size: 12, bold: true };
    sheet.getCell(`A${currentRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    currentRow += 2;

    const sRowHeader1 = currentRow;
    const sRowHeader2 = currentRow + 1;
    
    const SCORE_LOGICS = [
      { param: 'deaeration_temp', label: 'Deaeration', stepNum: 1 },
      { param: 'peak1_press', label: '1st Peak', stepNum: 2 },
      { param: 'peak2_press', label: '2nd Peak', stepNum: 4 },
      { param: 'peak3_press', label: '3rd Peak', stepNum: 6 },
      { param: 'holding_press', label: 'Holding 1', stepNum: 7 },
      { param: 'blow1_temp', label: 'Blow 1', stepNum: 8 },
      { param: 'holding2_press', label: 'Holding 2', stepNum: 9 },
      { param: 'blow2_temp', label: 'Blow 2', stepNum: 10 },
      { param: 'holding3_press', label: 'Holding 3', stepNum: 11 },
      { param: 'blow3_temp', label: 'Blow 3', stepNum: 12 },
      { param: 'holding4_press', label: 'Holding 4', stepNum: 13 },
      { param: 'blowdown_time', label: 'Blow-down', stepNum: 14 },
      { param: 'exhaust_time', label: 'Exhaust', stepNum: 15 }
    ];

    sheet.mergeCells(`A${sRowHeader1}:A${sRowHeader2}`); sheet.getCell(`A${sRowHeader1}`).value = 'Nomor\nSterillizer';
    sheet.mergeCells(`B${sRowHeader1}:B${sRowHeader2}`); sheet.getCell(`B${sRowHeader1}`).value = 'Siklus ke';
    sheet.mergeCells(`C${sRowHeader1}:O${sRowHeader1}`); sheet.getCell(`C${sRowHeader1}`).value = 'NILAI SCORE PARAMETER';
    sheet.mergeCells(`P${sRowHeader1}:P${sRowHeader2}`); sheet.getCell(`P${sRowHeader1}`).value = 'Keterangan';

    const scoreCols = ['C','D','E','F','G','H','I','J','K','L','M','N','O'];
    SCORE_LOGICS.forEach((logic, index) => {
        sheet.getCell(`${scoreCols[index]}${sRowHeader2}`).value = logic.label;
    });

    ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'].forEach(col => {
      formatBorder(sheet.getCell(`${col}${sRowHeader1}`));
      formatBorder(sheet.getCell(`${col}${sRowHeader2}`));
    });
    sheet.getRow(sRowHeader1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    sheet.getRow(sRowHeader2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    
    currentRow += 2;

    rows.forEach(r => {
      const cdata = typeof r.cycle_data === 'string' ? JSON.parse(r.cycle_data || '{}') : (r.cycle_data || {});
      const dId = r.device_id;
      const getTemp = (t) => cdata[t] !== undefined ? cdata[t] : '-';

      sheet.getCell(`A${currentRow}`).value = dId;
      sheet.getCell(`B${currentRow}`).value = r.cycle_number;
      sheet.getCell(`P${currentRow}`).value = '';

      const stepDetails = typeof r.step_details === 'string' ? JSON.parse(r.step_details || '[]') : (r.step_details || []);

      SCORE_LOGICS.forEach((logic, index) => {
        const st = stepDetails.find(s => s.step === logic.stepNum);
        const actual = st ? st.duration : 0;
        let target = cdata[`settings_score_logic_line_${dId}_${logic.param}_target__TARGET`] 
                     || cdata[`settings_score_logic_${logic.param}_target`] || 0;
        let score = cdata[`settings_score_logic_line_${dId}_${logic.param}_score__SCORE`]
                    || cdata[`settings_score_logic_${logic.param}_score`];
                    
        if (score === undefined || score === null || score === '-') {
            const t = Number(target)||0;
            const a = Number(actual)||0;
            if (t <= 0 || a <= 0) score = 0;
            else {
                score = Math.max(0, Math.round((1 - Math.abs(a - t) / t) * 100));
            }
        }
        sheet.getCell(`${scoreCols[index]}${currentRow}`).value = score;
      });

      ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'].forEach(col => formatBorder(sheet.getCell(`${col}${currentRow}`)));
      currentRow++;
    });

    if (rows.length < 15) {
      for(let i=rows.length; i<15; i++) {
        ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'].forEach(col => formatBorder(sheet.getCell(`${col}${currentRow}`)));
        currentRow++;
      }
    }

    currentRow += 2;

    // =========================================================
    // SECTION 3: GLOBAL PERFORMANCE & PARAMETERS (SIDE-BY-SIDE)
    // =========================================================
    const gRowTitle = currentRow;
    sheet.mergeCells(`C${gRowTitle}:F${gRowTitle}`);
    sheet.getCell(`C${gRowTitle}`).value = 'GLOBAL PERFORMANCE METRICS';
    sheet.getCell(`C${gRowTitle}`).font = { name: 'Arial', size: 9, bold: true };
    sheet.getCell(`C${gRowTitle}`).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(`G${gRowTitle}:O${gRowTitle}`);
    sheet.getCell(`G${gRowTitle}`).value = 'GLOBAL PARAMETERS';
    sheet.getCell(`G${gRowTitle}`).font = { name: 'Arial', size: 9, bold: true };
    sheet.getCell(`G${gRowTitle}`).alignment = { horizontal: 'center' };

    const gRowHeader = gRowTitle + 1;
    
    sheet.getCell(`A${gRowHeader}`).value = 'Nomor\nSterillizer';
    sheet.getCell(`B${gRowHeader}`).value = 'Siklus ke';
    
    // 4 Global Performance Metrics (Scores)
    sheet.getCell(`C${gRowHeader}`).value = 'Score FFB (%)';
    sheet.getCell(`D${gRowHeader}`).value = 'Score T_Ster (%)';
    sheet.getCell(`E${gRowHeader}`).value = 'Score T_Cyc (%)';
    sheet.getCell(`F${gRowHeader}`).value = 'Score Tput (%)';
    
    // 9 Global Parameters
    // Capacity
    sheet.getCell(`G${gRowHeader}`).value = 'Steril. Cap (ton)';
    sheet.getCell(`H${gRowHeader}`).value = 'No. Steril. (unit)';
    sheet.getCell(`I${gRowHeader}`).value = 'Mill Cap (mt/hr)';
    sheet.getCell(`J${gRowHeader}`).value = 'Actual Tput (mt/hr)';
    // Score Perf
    sheet.getCell(`K${gRowHeader}`).value = 'Steril Score (%)';
    sheet.getCell(`L${gRowHeader}`).value = 'Lead Time Score (%)';
    sheet.getCell(`M${gRowHeader}`).value = 'Tput Score (%)';
    // Over Limit
    sheet.getCell(`N${gRowHeader}`).value = 'Over Limit (s)';
    sheet.getCell(`O${gRowHeader}`).value = 'Over Limit (%)';

    ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'].forEach(c => {
        formatBorder(sheet.getCell(`${c}${gRowTitle}`));
        formatBorder(sheet.getCell(`${c}${gRowHeader}`));
        sheet.getCell(`${c}${gRowTitle}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        sheet.getCell(`${c}${gRowHeader}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        sheet.getCell(`${c}${gRowHeader}`).font = { name: 'Arial', size: 8, bold: true };
        sheet.getCell(`${c}${gRowHeader}`).alignment = { horizontal: 'center', wrapText: true };
    });

    currentRow = gRowHeader + 1;

    rows.forEach(r => {
      const cdata = typeof r.cycle_data === 'string' ? JSON.parse(r.cycle_data || '{}') : (r.cycle_data || {});
      const dId = r.device_id;
      
      sheet.getCell(`A${currentRow}`).value = dId;
      sheet.getCell(`B${currentRow}`).value = r.cycle_number;
      
      // 4 Global Performance Metrics
      sheet.getCell(`C${currentRow}`).value = cdata['settings_score_logic_ffb_loading_score'] || '0';
      sheet.getCell(`D${currentRow}`).value = cdata['settings_score_logic_target_ster_time_score'] || '0';
      sheet.getCell(`E${currentRow}`).value = cdata['settings_score_logic_target_cyc_time_score'] || '0';
      sheet.getCell(`F${currentRow}`).value = cdata['settings_score_logic_throughput_rate_score'] || '0';
      
      // 9 Global Parameters
      sheet.getCell(`G${currentRow}`).value = 50; // Sterilizer Design Cap
      sheet.getCell(`H${currentRow}`).value = 2; // No of Sterilizer
      sheet.getCell(`I${currentRow}`).value = cdata['settings_capacity_mill_design_capacity'] || 45.0; // Mill Design Cap
      sheet.getCell(`J${currentRow}`).value = cdata['settings_capacity_actual_throughput'] || 48322; // Actual Throughput
      
      sheet.getCell(`K${currentRow}`).value = cdata['settings_score_perf_steril'] || '0'; // Sterilization Score
      sheet.getCell(`L${currentRow}`).value = cdata['settings_score_perf_lead_time'] || '0'; // Lead Time Score
      sheet.getCell(`M${currentRow}`).value = cdata['settings_score_perf_throughput'] || '0'; // Throughput Score
      
      sheet.getCell(`N${currentRow}`).value = 300; // Over Limit Time
      sheet.getCell(`O${currentRow}`).value = 300; // Over Limit Score
      
      ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'].forEach(col => {
        formatBorder(sheet.getCell(`${col}${currentRow}`));
        sheet.getCell(`${col}${currentRow}`).font = { name: 'Arial', size: 9 };
        sheet.getCell(`${col}${currentRow}`).alignment = { horizontal: 'center' };
      });
      currentRow++;
    });
    
    if (rows.length < 5) {
      for(let i=rows.length; i<5; i++) {
        ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'].forEach(col => {
          formatBorder(sheet.getCell(`${col}${currentRow}`));
        });
        currentRow++;
      }
    }

    currentRow += 2;

    // Tanda Tangan Score
    drawSignature(currentRow);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Logsheet_Sterilizer_${date || 'All'}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
