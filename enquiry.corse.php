<?php
// =====================================================
// template.php (Full File)
// - Search training details by Thai Citizen ID (13 digits)
// - Shows latest record by completion_time
// - Theme: minimal, clean, consistent with provided screenshots
// - PHP 5.x compatible
// =====================================================

include 'appconfig.php';

// ------------------------
// Validate Thai ID (13 digits + checksum)
// ------------------------
function isValidThaiID($id) {
    if (!preg_match('/^[0-9]{13}$/', $id)) return false;

    $sum = 0;
    for ($i = 0; $i < 12; $i++) {
        $sum += intval($id[$i]) * (13 - $i);
    }
    $check = (11 - ($sum % 11)) % 10;

    return ($check === intval($id[12]));
}

// ------------------------
// Mask citizen id: show only last 6 digits, others as X
// Example: 1234567890123 -> XXXXXXX901223  (7 X + last 6)
// ------------------------
function maskCitizenIdLast6($id) {
    $id = preg_replace('/[^0-9]/', '', (string)$id);
    if (strlen($id) !== 13) return $id;
    return str_repeat('X', 7) . substr($id, 7, 6);
}

// ------------------------
// Safe output
// ------------------------
function e($s) {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

// ------------------------
// Format date to Thai format: วัน เดือน ปี (พ.ศ.)
// Accepts: YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, DD/MM/YYYY, DD/MM/YYYY HH:MM:SS, or anything strtotime can parse
// Returns: เช่น 1 มกราคม 2569
// ------------------------
function formatThaiDate($dateStr) {
    $dateStr = trim((string)$dateStr);
    if ($dateStr === '' || $dateStr === 'ไม่มีข้อมูล') return $dateStr;

    $dt = null;

    // Try common explicit formats first
    if (preg_match('/^\d{2}\/\d{2}\/\d{4}(\s+\d{2}:\d{2}:\d{2})?$/', $dateStr)) {
        $fmt = (strpos($dateStr, ' ') !== false) ? 'd/m/Y H:i:s' : 'd/m/Y';
        $dt = DateTime::createFromFormat($fmt, $dateStr);
    } elseif (preg_match('/^\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2}:\d{2})?$/', $dateStr)) {
        $fmt = (strpos($dateStr, ' ') !== false) ? 'Y-m-d H:i:s' : 'Y-m-d';
        $dt = DateTime::createFromFormat($fmt, $dateStr);
    }

    // Fallback: strtotime
    if (!$dt) {
        $ts = strtotime($dateStr);
        if ($ts !== false) {
            $dt = new DateTime();
            $dt->setTimestamp($ts);
        }
    }

    if (!$dt) return $dateStr;

    $day = (int)$dt->format('j');
    $month = (int)$dt->format('n');
    $year = (int)$dt->format('Y') + 543;

    $months = array(
        1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
        5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
        9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
    );

    $mth = isset($months[$month]) ? $months[$month] : $dt->format('m');
    return $day . ' ' . $mth . ' ' . $year;
}


// ------------------------
// Format date to Thai short format: 11 ก.พ. 2569
// - Uses day + abbreviated Thai month + Buddhist year
// - Does NOT display time
// ------------------------
function formatThaiDateShort($dateStr) {
    $dateStr = trim((string)$dateStr);
    if ($dateStr === '' || $dateStr === 'ไม่มีข้อมูล') return '';

    $dt = null;

    if (preg_match('/^\d{2}\/\d{2}\/\d{4}(\s+\d{2}:\d{2}:\d{2})?$/', $dateStr)) {
        $fmt = (strpos($dateStr, ' ') !== false) ? 'd/m/Y H:i:s' : 'd/m/Y';
        $dt = DateTime::createFromFormat($fmt, $dateStr);
    } elseif (preg_match('/^\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2}:\d{2})?$/', $dateStr)) {
        $fmt = (strpos($dateStr, ' ') !== false) ? 'Y-m-d H:i:s' : 'Y-m-d';
        $dt = DateTime::createFromFormat($fmt, $dateStr);
    }

    if (!$dt) {
        $ts = strtotime($dateStr);
        if ($ts !== false) {
            $dt = new DateTime();
            $dt->setTimestamp($ts);
        }
    }

    if (!$dt) return '';

    $months = array(
        1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.',
        5 => 'พ.ค.', 6 => 'มิ.ย.', 7 => 'ก.ค.', 8 => 'ส.ค.',
        9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.'
    );

    $day = (int)$dt->format('j');
    $month = (int)$dt->format('n');
    $year = (int)$dt->format('Y') + 543;

    return $day . ' ' . $months[$month] . ' ' . $year;
}


// ------------------------
// Format delimited text into multi-line for display
// - Replaces delimiter with new line, trims each line, removes empty lines
// ------------------------
function formatDelimitedToMultiline($s, $delimiter) {
    $s = (string)$s;
    $s = str_replace(array("\r\n", "\r"), "\n", $s);

    if ($delimiter === ';') {
        $s = preg_replace('/\s*;\s*/', "\n", $s);
    } elseif ($delimiter === ':') {
        $s = preg_replace('/\s*:\s*/', "\n", $s);
    }

    $out = array();
    $parts = explode("\n", $s);
    foreach ($parts as $p) {
        $p = trim($p);
        if ($p !== '') $out[] = $p;
    }
    return implode("\n", $out);
}


// ------------------------
// Discover column names safely (so template works even if schema differs)
// ------------------------
function getRegisterColumns($db, $tableName) {
    $cols = array();
    $sql = "SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = ?";
    $stmt = $db->prepare($sql);
    if (!$stmt) return $cols;

    $schema = DB_NAME;
    $stmt->bind_param("ss", $schema, $tableName);
    if ($stmt->execute()) {
        $res = $stmt->get_result();
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $cols[] = (string)$row['COLUMN_NAME'];
            }
        }
    }
    $stmt->close();

    return $cols;
}

function pickFirstExisting($candidates, $existingCols) {
    $lookup = array();
    foreach ($existingCols as $c) $lookup[strtolower($c)] = $c;

    foreach ($candidates as $cand) {
        $k = strtolower($cand);
        if (isset($lookup[$k])) return $lookup[$k];
    }
    return '';
}


// ------------------------
// Format past courses:
// - Split by ';'
// - Sort by leading number (e.g. "14.คอร์ส..." -> 14)
// - Join with new lines
// ------------------------
function formatPastCourses($s) {
    $s = trim((string)$s);
    if ($s === '' || $s === 'ไม่มีข้อมูล') return $s;

    $parts = preg_split('/\s*;\s*/', $s);
    $items = array();
    foreach ($parts as $p) {
        $p = trim((string)$p);
        if ($p === '') continue;
        $items[] = $p;
    }
    if (empty($items)) return 'ไม่มีข้อมูล';

    usort($items, function($a, $b) {
        $na = 1000000000;
        $nb = 1000000000;
        if (preg_match('/^\s*(\d+)/', $a, $ma)) $na = intval($ma[1]);
        if (preg_match('/^\s*(\d+)/', $b, $mb)) $nb = intval($mb[1]);
        if ($na === $nb) return 0;
        return ($na < $nb) ? -1 : 1;
    });

    return implode("\n", $items);
}

// ------------------------
// Format wanted courses:
// - Split by ';'
// - If contains ':' -> break line after ':'
// - Sort by [Pillar 1] then [Pillar 2] then [Pillar 3]
// ------------------------
function formatWantCourses($s) {
    $s = trim((string)$s);
    if ($s === '' || $s === 'ไม่มีข้อมูล') return $s;

    // Split items by ';' (primary) and also support line breaks as separators
    $parts = preg_split('/\s*;\s*|\n+/', $s);

    // Thai month mapping (lowercase)
    $thaiMonths = array(
        'มกราคม' => 1,
        'กุมภาพันธ์' => 2,
        'มีนาคม' => 3,
        'เมษายน' => 4,
        'พฤษภาคม' => 5,
        'มิถุนายน' => 6,
        'กรกฎาคม' => 7,
        'สิงหาคม' => 8,
        'กันยายน' => 9,
        'ตุลาคม' => 10,
        'พฤศจิกายน' => 11,
        'ธันวาคม' => 12
    );

    // Extract sortable date key (YYYYMMDD in ค.ศ.) from the 2nd bracket: [10 มิถุนายน 2569]
    $extractDateKey = function($item) use ($thaiMonths) {
        $key = 99991231; // default: put unknown dates at the end

        // Find pattern: [Pillar X] [DD <thai_month> YYYY]
        if (preg_match('/\]\s*\[\s*([0-9]{1,2})\s+([^\s\]]+)\s+([0-9]{4})\s*\]/u', $item, $m)) {
            $day = intval($m[1]);
            $monName = trim($m[2]);
            $year = intval($m[3]);

            // Normalize year: if Buddhist year (>=2400) convert to CE
            if ($year >= 2400) $year = $year - 543;

            // Normalize month name (remove trailing punctuation)
            $monName = preg_replace('/[^\p{Thai}]/u', '', $monName);

            $month = isset($thaiMonths[$monName]) ? intval($thaiMonths[$monName]) : 0;

            if ($month >= 1 && $month <= 12 && $day >= 1 && $day <= 31 && $year >= 1900 && $year <= 2100) {
                $key = ($year * 10000) + ($month * 100) + $day;
            }
        }

        return $key;
    };

    $items = array();
    $idx = 0;
    foreach ($parts as $p) {
        $p = trim((string)$p);
        if ($p === '') continue;

        $pillar = 9;
        if (preg_match('/\[\s*Pillar\s*([123])\s*\]/i', $p, $mm)) {
            $pillar = intval($mm[1]);
        }

        $items[] = array(
            'item' => $p,
            'datekey' => $extractDateKey($p),
            'pillar' => $pillar,
            'idx' => $idx
        );
        $idx++;
    }

    if (empty($items)) return 'ไม่มีข้อมูล';

    // Sort by date (from the 2nd bracket) ASC, then pillar ASC, then original order
    usort($items, function($a, $b) {
        if ($a['datekey'] !== $b['datekey']) return ($a['datekey'] < $b['datekey']) ? -1 : 1;
        if ($a['pillar'] !== $b['pillar']) return ($a['pillar'] < $b['pillar']) ? -1 : 1;
        if ($a['idx'] !== $b['idx']) return ($a['idx'] < $b['idx']) ? -1 : 1;
        return 0;
    });

    // Output format:
    // 1. [Pillar X] ...:
    // วิชา...
    $out = array();
    $i = 1;
    foreach ($items as $row) {
        $item = trim((string)$row['item']);
        if ($item === '') continue;

        // Break after FIRST ':' (keep remaining ':' in the course name)
        $pos = strpos($item, ':');
        if ($pos !== false) {
            $head = trim(substr($item, 0, $pos));
            $tail = trim(substr($item, $pos + 1));
            $out[] = $i . '. ' . $head . ':';
            if ($tail !== '') {
                $out[] = $tail;
            }
        } else {
            $out[] = $i . '. ' . $item;
        }

        $i++;
    }

    return implode("\n", $out);
}

// ------------------------
// Search handler (GET)
// ------------------------
$qId = isset($_GET['citizen_id']) ? trim($_GET['citizen_id']) : '';
$qIdDigits = preg_replace('/[^0-9]/', '', $qId);

$errMsg = '';
$notFoundMsg = '';
$result = null;

$licenseNoVal = '';
$licenseExpiryVal = '';
$courseTypeVal = '';
$renewLevelVal = '';

if ($qId !== '' || isset($_GET['citizen_id'])) {

    if ($qIdDigits === '' || !preg_match('/^[0-9]{13}$/', $qIdDigits)) {
        $errMsg = "กรุณากรอกเลขบัตรประชาชน 13 หลัก";
    } elseif (!isValidThaiID($qIdDigits)) {
        $errMsg = "เลขบัตรประชาชนไม่ถูกต้องตามรูปแบบราชการ";
    } else {

        $db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($db->connect_errno) {
            $errMsg = "เชื่อมต่อฐานข้อมูลไม่สำเร็จ";
        } else {
            $db->set_charset("utf8mb4");

            // Try to search in table `register` (default in this project)
            $table = defined('DB_TABLE_REGISTER') ? DB_TABLE_REGISTER : 'register';
            $cols = getRegisterColumns($db, $table);

            
            // Fallback when information_schema is not accessible:
            // assume standard columns exist as per project schema
            if (empty($cols)) {
                $cols = array(
                    'national_id','citizen_id','id_code',
                    'first_name_th','last_name_th',
                    'email_alt','region_bangkok','viriyah_agent_code',
                    'license_no','course_type','broker_level','agent_level',
                    'past_training_5y','renew_other',
                    'completion_time','updated_at','submit_time','created_at'
                );
            }
if (empty($cols)) {
                $errMsg = "ไม่มีข้อมูล";
            } else {
                // Candidate columns (project has used different names over time)
                $idCol = pickFirstExisting(array('national_id','citizen_id','id_code','idcard','id_card','citizenid'), $cols);

                $firstNameCol = pickFirstExisting(array('first_name_th','firstname_th','first_name','firstname'), $cols);
                $lastNameCol  = pickFirstExisting(array('last_name_th','lastname_th','last_name','lastname'), $cols);
                $titleCol     = pickFirstExisting(array('title_th','title','prefix_th'), $cols);

                $emailCol = pickFirstExisting(array('email_alt'), $cols);
                if ($emailCol === '') {
                    $emailCol = pickFirstExisting(array('email'), $cols);
                }

                $branchCol = pickFirstExisting(array('region_bangkok'), $cols);


                $agentCodeCol = pickFirstExisting(array('viriyah_agent_code','agent_code'), $cols);
$licenseNoCol = pickFirstExisting(array('license_no','license_number','licenseNo'), $cols);
$licenseExpiryCol = pickFirstExisting(array('license_expiry_date','license_expire_date','license_expiry','expiry_date'), $cols);
$courseTypeCol = pickFirstExisting(array('course_type','license_type','lic_type'), $cols);
$brokerLevelCol = pickFirstExisting(array('broker_level'), $cols);
$agentLevelCol  = pickFirstExisting(array('agent_level'), $cols);
                // Past / desired courses: map to specified columns (with safe fallback)
                $pastCourseCol = pickFirstExisting(array('past_training_5y'), $cols);
                if ($pastCourseCol === '') {
                    $pastCourseCol = pickFirstExisting(array(
                        'training_course','training_courses','course_completed','completed_course','courses_completed'
                    ), $cols);
                }

                $wantCourseCol = pickFirstExisting(array('renew_other'), $cols);
                if ($wantCourseCol === '') {
                    $wantCourseCol = pickFirstExisting(array(
                        'training_course_wanted','training_course_need','training_course_required',
                        'course_wanted','desired_course','courses_wanted','courses_needed'
                    ), $cols);
                }
                

                // Optional override columns for wanted courses:
                // If ANY of these columns has data, the system will display them instead of renew_other
                $renewAgent1Col  = pickFirstExisting(array('renew_agent_1'), $cols);
                $renewAgent2Col  = pickFirstExisting(array('renew_agent_2'), $cols);
                $renewAgent3Col  = pickFirstExisting(array('renew_agent_3'), $cols);
                $renewBroker1Col = pickFirstExisting(array('renew_broker_1'), $cols);
                $renewBroker2Col = pickFirstExisting(array('renew_broker_2'), $cols);
                $renewBroker3Col = pickFirstExisting(array('renew_broker_3'), $cols);
$completionCol = pickFirstExisting(array('completion_time', 'complete_time', 'completed_at', 'completion_datetime'), $cols);
$pkCol = pickFirstExisting(array('id', 'register_id', 'rid'), $cols);

                if ($idCol === '') {
                    $errMsg = "ไม่มีข้อมูล";
                } else {

                    // Build SELECT list only for columns that exist
                    $selectParts = array();
                    if ($titleCol     !== '') $selectParts[] = "`$titleCol` AS title_th";
                    if ($firstNameCol !== '') $selectParts[] = "`$firstNameCol` AS first_name_th";
                    if ($lastNameCol  !== '') $selectParts[] = "`$lastNameCol` AS last_name_th";
                    if ($emailCol     !== '') $selectParts[] = "`$emailCol` AS email";
                    if ($branchCol    !== '') $selectParts[] = "`$branchCol` AS branch";
                    if ($agentCodeCol !== '') $selectParts[] = "`$agentCodeCol` AS agent_code";
                    if ($licenseNoCol !== '') $selectParts[] = "`$licenseNoCol` AS license_no";
                    if ($licenseExpiryCol !== '') $selectParts[] = "`$licenseExpiryCol` AS license_expiry_date";
                    if ($courseTypeCol !== '') $selectParts[] = "`$courseTypeCol` AS course_type";
                    if ($brokerLevelCol !== '') $selectParts[] = "`$brokerLevelCol` AS broker_level";
                    if ($agentLevelCol  !== '') $selectParts[] = "`$agentLevelCol` AS agent_level";
                    if ($pastCourseCol !== '') $selectParts[] = "`$pastCourseCol` AS past_courses";
                    if ($wantCourseCol !== '') $selectParts[] = "`$wantCourseCol` AS want_courses";
                    if ($renewAgent1Col  !== '') $selectParts[] = "`$renewAgent1Col` AS renew_agent_1";
                    if ($renewAgent2Col  !== '') $selectParts[] = "`$renewAgent2Col` AS renew_agent_2";
                    if ($renewAgent3Col  !== '') $selectParts[] = "`$renewAgent3Col` AS renew_agent_3";
                    if ($renewBroker1Col !== '') $selectParts[] = "`$renewBroker1Col` AS renew_broker_1";
                    if ($renewBroker2Col !== '') $selectParts[] = "`$renewBroker2Col` AS renew_broker_2";
                    if ($renewBroker3Col !== '') $selectParts[] = "`$renewBroker3Col` AS renew_broker_3";

                    $selectParts[] = "`$idCol` AS citizen_id";
                    if ($completionCol !== '') $selectParts[] = "`$completionCol` AS completion_time";

                    // Search ONLY completed transactions.
                    // completion_time must exist and must not be NULL / empty / whitespace / '0000-00-00 00:00:00'.
                    // If duplicate national_id exist, select the record with the latest completion_time.
                    if ($completionCol === '') {
                        // If the table does not have completion_time, treat it as "not found".
                        $notFoundMsg = "ไม่พบข้อมูลการอบรมของท่าน";
                    } else {
                        $orderParts = array("`$completionCol` DESC");
                        if (!empty($pkCol)) {
                            $orderParts[] = "`$pkCol` DESC";
                        }
                        $orderBy = " ORDER BY " . implode(", ", $orderParts) . " ";

                        $sql = "SELECT " . implode(", ", $selectParts) . "
                                FROM `$table`
                                WHERE LEFT(REPLACE(REPLACE(`$idCol`,'-',''),' ',''),13) = ?
                                  AND `$completionCol` IS NOT NULL
                                  AND TRIM(`$completionCol`) <> ''
                                  AND `$completionCol` <> '0000-00-00 00:00:00'
                                $orderBy
                                LIMIT 1";

                        $stmt = $db->prepare($sql);
                        if (!$stmt) {
                            $errMsg = "ไม่มีข้อมูล";
                        } else {
                            $stmt->bind_param("s", $qIdDigits);
                            if ($stmt->execute()) {
                                $res = $stmt->get_result();
                                if ($res && $res->num_rows > 0) {
                                    $result = $res->fetch_assoc();
                                } else {
                                    $notFoundMsg = "ไม่พบข้อมูลการอบรมของท่าน";
                                }
                            } else {
                                $errMsg = "ไม่มีข้อมูล";
                            }
                            $stmt->close();
                        }
                    }

                }
            }
            $db->close();
        }
    }
}
?>
<!doctype html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ค้นหารายละเอียดข้อมูลการอบรม</title>
    <style>
        :root{
            --bg: #f4f6f8;
            --card: #ffffff;
            --primary: #0b3d91;  /* deep blue */
            --accent: #f6c343;   /* warm yellow */
            --text: #0f172a;
            --muted: #64748b;
            --border: #e5e7eb;
        }
        *{ box-sizing: border-box; }
        body{
            margin:0;
            font-family: system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif;
            background: var(--bg);
            color: var(--text);
        }
        .wrap{
            max-width: 1180px;
            margin: 28px auto;
            padding: 0 18px;
        }
        .shell{
            display: flex;
            gap: 0;
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(2, 6, 23, .10);
            background: var(--card);
        }
        .left{
            flex: 1.05;
            padding: 36px 34px;
            background: var(--card);
        }
        .right{
            flex: 0.95;
            padding: 32px 26px;
            background: var(--primary);
            display:flex;
            align-items: center;
            justify-content: center;
        }
        .brand{
            display:flex;
            align-items:center;
            gap: 14px;
            margin-bottom: 18px;
        }
        .logo{
            width: 64px;
            height: 64px;
            border-radius: 14px;
            background: #11182710;
            display:flex;
            align-items:center;
            justify-content:center;
            font-weight: 800;
            color: var(--primary);
        }
        .brand h1{
            font-size: 22px;
            line-height: 1.3;
            margin:0;
            color: var(--primary);
            font-weight: 800;
        }
        .brand p{
            margin: 6px 0 0 0;
            color: var(--muted);
            font-size: 14px;
        }
        .info{
            margin-top: 18px;
            background: #fff7db;
            border: 1px solid #fde68a;
            padding: 18px 18px;
            border-radius: 14px;
        }
        .info b{ color:#8a5a00; }
        .info ul{
            margin: 10px 0 0 18px;
            padding: 0;
            color:#3b3b3b;
            font-size: 14px;
            line-height: 1.7;
        }
        .panel{
            width: min(520px, 100%);
            background: var(--card);
            border-radius: 18px;
            padding: 22px 22px;
            box-shadow: 0 12px 28px rgba(0,0,0,.18);
        }
        .panel h2{
            margin:0 0 14px 0;
            font-size: 22px;
            color: var(--primary);
            font-weight: 800;
        }
        .field{
            margin-top: 12px;
        }
        label{
            display:block;
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 6px;
        }
        input[type="text"]{
            width: 100%;
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid var(--border);
            outline: none;
            font-size: 15px;
        }
        input[type="text"]:focus{
            border-color: #93c5fd;
            box-shadow: 0 0 0 4px rgba(59,130,246,.15);
        }
        .help{
            margin-top: 8px;
            font-size: 12px;
            color: var(--muted);
        }
        .btn{
            margin-top: 14px;
            width: 100%;
            border: none;
            padding: 12px 16px;
            border-radius: 999px;
            background: var(--accent);
            font-weight: 800;
            font-size: 15px;
            cursor: pointer;
        }
        .msg{
            margin-top: 14px;
            padding: 12px 14px;
            border-radius: 12px;
            font-size: 14px;
        }
        .msg.err{
            background: #fff1f2;
            border: 1px solid #fecdd3;
            color: #9f1239;
        }
        .msg.ok{
            background: #ecfeff;
            border: 1px solid #a5f3fc;
            color: #155e75;
        }
        .result{
            margin-top: 14px;
            border-top: 1px dashed var(--border);
            padding-top: 14px;
        }
        .row{
            display:flex;
            justify-content: space-between;
            gap: 14px;
            padding: 10px 0;
            border-bottom: 1px solid #f1f5f9;
        }

        .row.stack{
            flex-direction: column;
            align-items: flex-start;
        }
        .row.stack .k{
            min-width: 0;
            margin-bottom: 6px;
        }
        .row.stack .v{
            width: 100%;
            text-align: left;
            font-weight: 400;
        }
        .row:last-child{ border-bottom:none; }
        .k{
            width: 44%;
            color: #334155;
            font-weight: 700;
            font-size: 14px;
        }
        .v{
            width: 56%;
            color: #0f172a;
            font-size: 14px;
            text-align: right;
            word-break: break-word;
        }
        .badge{
            display:inline-block;
            padding: 3px 10px;
            border-radius: 999px;
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #dbeafe;
            font-size: 12px;
            font-weight: 800;
        }
        @media (max-width: 980px){
            .shell{ flex-direction: column; }
            .right{ padding: 22px 18px; }
            .left{ padding: 26px 22px; }
        }
    
        /* --- Left column (match fronttemplate.php) --- */
        .left img{ display:block; margin:0 auto 8px; max-width:520px; width:90%; height:auto; }
        .title-main{ font-size:24px; font-weight:700; color:#002c6a; margin:0 0 4px 0; line-height:1.25; }
        .premium-bar{ margin-top:16px; border-radius:16px; background:#ffe6a3; padding:18px 18px; font-size:14px; color:#7a4a00; font-weight:600; line-height:1.55; }
        .premium-bar a{ color:#0b3d91; font-weight:800; text-decoration:none; }
        .premium-bar a:hover{ text-decoration:underline; }

    </style>
</head>
<body>
<div class="wrap">
    <div class="shell">
        <div class="left">

            <img src="logo-vonlinelearning.jpg" width="90%" alt="logo">
            <h1 class="title-main"><br>ศูนย์ฝึกอบรมและพัฒนานักประกันภัย<br>บริษัท วิริยะประกันภัย จำกัด (มหาชน)</h1><br>

            <div id="step23Block" class="premium-bar focus-target">
                <div style="font-size:150%; font-weight:900;">ศูนย์ฝึกอบรมและพัฒนานักประกันภัย <br> ขอบคุณทุกท่านที่ลงทะเบียนอบรมปี 2569</div><br><br>
ข้อมูลทางด้านขวาของท่าน คือ รายละเอียดที่ท่านได้แจ้งในการลงทะเบียนอบรม กรุณาตรวจสอบความถูกต้องทั้งหมด หากท่านพบว่าข้อมูลของท่านไม่ถูกต้อง กรุณา email พร้อมแจ้งรายละเอียดที่ต้องการแก้ไขได้ที่ iptc.ops@viriyah.co.th<br><br>

หากว่าข้อมูลทุกอย่างถูกต้อง<br>ท่านจะได้รับ e-mail เพื่อเข้าอบรมก่อนวันอบรมจริง 15 วัน เพื่อตั้ง password<br>และจะได้รับ email ยืนยันก่อนเข้ารอบอบรมจริง 7 วัน<br><br>
                หากท่านมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม กรุณาติดต่อ ผ่าน<br>
                Line Official Account :
                <a href="https://lin.ee/4k6FJ6g" target="_blank" rel="noopener noreferrer">@viriyahiptc</a>
                หรือ
                <a href="https://lin.ee/4k6FJ6g" target="_blank" rel="noopener noreferrer">https://lin.ee/4k6FJ6g</a>
                <br><br>
                
ถ้ามีข้อสงสัยเกี่ยวกับระบบ V Online Learning ติดต่อสอบถาม<br>
ทีมบริการและสนับสนุนผู้ใช้ระบบ V Online Learning    <br>
จะสอบถามข้อมูลส่วนตัว เพื่อให้ได้คำแนะนำที่ถูกต้องเฉพาะตัวท่านเองได้ที่<br><br>

โทร: 02-821-6729<br>
วันจันทร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ เวลา 9:00 - 17:00 น.    <br><br>

LINE: @IPTC.LMS<br>
Email: iptc.support.vol@viriyah.co.th<br>
วันจันทร์ - ศุกร์ เวลา 9:00 - 20:00 น.<br>
วันเสาร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ เวลา 9:00 - 17:00 น.
                
            </div>
        
        </div>

        <div class="right">
            <div class="panel">
                <h2>ค้นหารายละเอียดข้อมูลการอบรม</h2>

                <form method="get" action="">
                    <div class="field">
                        <label for="citizen_id">เลขบัตรประชาชน</label>
                        <input
                            type="text"
                            id="citizen_id"
                            name="citizen_id"
                            inputmode="numeric"
                            autocomplete="off"
                            maxlength="13"
                            placeholder="ตัวเลข 13 หลัก"
                            value="<?php echo e($qIdDigits); ?>"
                        >
                        <div class="help">* กรอกเฉพาะตัวเลข 13 หลัก</div>
                    </div>

                    <button class="btn" type="submit">ค้นหา</button>
                </form>

                <?php if ($errMsg !== ''): ?>
                    <div class="msg err"><?php echo e($errMsg); ?></div>
                <?php elseif ($notFoundMsg !== ''): ?>
                    <div class="msg err"><?php echo e($notFoundMsg); ?></div>
                <?php elseif (is_array($result)): ?>
                    <?php
                        $title = isset($result['title_th']) ? trim((string)$result['title_th']) : '';
                        $firstN = isset($result['first_name_th']) ? trim((string)$result['first_name_th']) : '';
                        $lastN  = isset($result['last_name_th'])  ? trim((string)$result['last_name_th'])  : '';
                        $fullName = trim(preg_replace('/\\s+/', ' ', trim($title . ' ' . $firstN . ' ' . $lastN)));
                        if ($fullName === '') $fullName = 'ไม่มีข้อมูล';

                        $emailVal = isset($result['email']) ? trim((string)$result['email']) : '';
                        if ($emailVal === '') $emailVal = 'ไม่มีข้อมูล';

                        $branchVal = isset($result['branch']) ? trim((string)$result['branch']) : '';
                        if ($branchVal === '') $branchVal = 'ไม่มีข้อมูล';


                        $agentCodeVal = isset($result['agent_code']) ? trim((string)$result['agent_code']) : '';
                        $agentCodeVal = preg_replace('/\s+/', '', $agentCodeVal);
                        if ($agentCodeVal === '') $agentCodeVal = 'ไม่มีข้อมูล';

                        $licenseNoVal = isset($result['license_no']) ? trim((string)$result['license_no']) : '';
                        if ($licenseNoVal === '') $licenseNoVal = 'ไม่มีข้อมูล';

                        $licenseExpiryVal = isset($result['license_expiry_date']) ? trim((string)$result['license_expiry_date']) : '';
                        if ($licenseExpiryVal === '') $licenseExpiryVal = 'ไม่มีข้อมูล';

                        if ($licenseExpiryVal !== '' && $licenseExpiryVal !== 'ไม่มีข้อมูล') {
                            $licenseExpiryVal = formatThaiDate($licenseExpiryVal);
                        }

                        $courseTypeVal = isset($result['course_type']) ? trim((string)$result['course_type']) : '';
                        if ($courseTypeVal === '') $courseTypeVal = 'ไม่มีข้อมูล';

                        $brokerLevelTmp = isset($result['broker_level']) ? trim((string)$result['broker_level']) : '';
                        $agentLevelTmp  = isset($result['agent_level']) ? trim((string)$result['agent_level']) : '';
                        $renewLevelVal = ($brokerLevelTmp !== '') ? $brokerLevelTmp : $agentLevelTmp;
                        if ($renewLevelVal === '') $renewLevelVal = 'ไม่มีข้อมูล';

                        $pastCourses = isset($result['past_courses']) ? trim((string)$result['past_courses']) : '';
                        if ($pastCourses === '') $pastCourses = 'ไม่มีข้อมูล';

                        // Wanted courses:
// If any override columns has data, use them instead of renew_other (want_courses)
// AND prefix display with 'หลักสูตรต่อไป' before the list (keep formatWantCourses() unchanged)
$wantCandidates = array();
$keys = array('renew_agent_1','renew_agent_2','renew_agent_3','renew_broker_1','renew_broker_2','renew_broker_3');
foreach ($keys as $k) {
    if (isset($result[$k])) {
        $v = trim((string)$result[$k]);
        if ($v !== '') $wantCandidates[] = $v;
    }
}

$pastCoursesDisplay = formatPastCourses($pastCourses);

if (!empty($wantCandidates)) {
    // Join by ';' so formatWantCourses() keeps working exactly the same
    $wantCoursesRaw = implode('; ', $wantCandidates);
    $formattedWanted = formatWantCourses($wantCoursesRaw);

    // Put renew level before the items (as requested)
    if (!empty($renewLevelVal) && $renewLevelVal !== 'ไม่มีข้อมูล') {
        $wantCoursesDisplay = "หลักสูตรที่ท่านต้องอบรมคือ : " . $renewLevelVal . "
" . $formattedWanted;
    } else {
        $wantCoursesDisplay = $formattedWanted;
    }
} else {
    $wantCourses = isset($result['want_courses']) ? trim((string)$result['want_courses']) : '';
    if ($wantCourses === '') $wantCourses = 'ไม่มีข้อมูล';
    $wantCoursesDisplay = formatWantCourses($wantCourses);
}

                        $maskedId = isset($result['citizen_id']) ? maskCitizenIdLast6($result['citizen_id']) : maskCitizenIdLast6($qIdDigits);
                    ?>
                    <?php
    $registrationDate = isset($result['completion_time']) ? formatThaiDateShort($result['completion_time']) : '';
    if ($registrationDate === '') $registrationDate = 'ไม่ทราบวันที่';
?>
<div class="msg ok">
    <span class="badge">พบข้อมูล</span> ข้อมูลที่ท่านลงทะเบียนด้วยตนเองในวันที่ <b><?php echo e($registrationDate); ?></b>
</div>

                    <div class="result">
                        <div class="row">
                            <div class="k">ชื่อ - นามสกุล</div>
                            <div class="v"><?php echo e($fullName); ?></div>
                        </div>
                        <div class="row">
                            <div class="k">รหัสบัตรประชาชน</div>
                            <div class="v"><?php echo e($maskedId); ?></div>
                        </div>
                        <div class="row">
                            <div class="k">อีเมล</div>
                            <div class="v"><?php echo e($emailVal); ?></div>
                        </div>
                        <div class="row">
                            <div class="k">สาขาที่สังกัด</div>
                            <div class="v"><?php echo e($branchVal); ?></div>
                        </div>
                        <div class="row">
                            <div class="k">รหัสตัวแทน/นายหน้า</div>
                            <div class="v" style="text-align:right;"><?php echo e($agentCodeVal); ?></div>
                        </div>
                        <div class="row">
                            <div class="k">เลขที่ใบอนุญาต</div>
                            <div class="v" style="text-align:right;"><?php echo e($licenseNoVal); ?></div>
                        </div>
                        <div class="row">
                            <div class="k">วันใบอนุญาตหมดอายุ</div>
                            <div class="v" style="text-align:right;"><?php echo e($licenseExpiryVal); ?></div>
                        </div>
                        <div class="row">
                            <div class="k">ประเภทใบอนุญาต</div>
                            <div class="v" style="text-align:right;"><?php echo e($courseTypeVal); ?></div>
                        </div>
                        <div class="row">
                            <div class="k">หลักสูตรที่ท่านต้องอบรมคือ</div>
                            <div class="v" style="text-align:right;"><?php echo e($renewLevelVal); ?></div>
                        </div>
                        <div class="row stack">
                                    <div class="v"><b>วิชาที่ท่านแจ้งว่าผ่านการอบรมแล้ว<br> <p style="color:red;">วิชาที่ท่านผ่านการอบรมแล้ว จะไม่จัดท่านเข้าอบรมหลักสูตรนั้นอีก</p></b></div>
                                    <div class="v"><?php echo nl2br(e($pastCoursesDisplay)); ?></div>
                                </div>
                        <div class="row stack">
                                    <div class="v"><b>วิชาที่ท่านลงทะเบียนเพื่ออบรมในปี 2569</b></div>
                                    <div class="v"><?php echo nl2br(e($wantCoursesDisplay)); ?></div>
                                </div>
                    </div>
                <?php endif; ?>

            </div>
        </div>
    </div>
</div>
</body>
</html>