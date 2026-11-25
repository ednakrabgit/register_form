<?php
// =====================================================
//  Viriyah Registration Form (PHP Version)
//  แปลงจาก viriyah_registration_form.html
//  โครงสร้าง code ลอกจาก index.php
// =====================================================

include 'appconfig.php';

// Create DB connection for rendering
$render_db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
$render_db->set_charset("utf8mb4");

function getOptionsHtml($db, $table, $selectedValue = '') {
    $html = '<option value="">-- กรุณาเลือก --</option>';
    $res = $db->query("SELECT id, name FROM $table WHERE status='active' ORDER BY display_order");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $selected = ($selectedValue == $row['id'] || $selectedValue == $row['name']) ? ' selected' : '';
            $html .= '<option value="' . htmlspecialchars($row['id']) . '"' . $selected . '>' . htmlspecialchars($row['name']) . '</option>';
        }
    }
    return $html;
}

$courseScheduleData = [
    'ตัวแทนประกันวินาศภัย' => [],
    'นายหน้าประกันวินาศภัย' => []
];

if (isset($render_db)) {
    // 1. Get basic courses
    $res = $render_db->query("
        SELECT b.id, b.course_name, b.agent_type, d.course_date_display 
        FROM mst_renew_basic b
        LEFT JOIN mst_renew_dates d ON b.date_id = d.id
        WHERE b.status = 'active'
        ORDER BY b.id
    ");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $category = ($row['agent_type'] === 'agent') ? 'ตัวแทนประกันวินาศภัย' : 'นายหน้าประกันวินาศภัย';
            $is_complex = (strpos($row['course_name'], '4 เป็นต้นไป') !== false);
            
            $courseScheduleData[$category][$row['id']] = [
                'name' => $row['course_name'],
                'is_complex' => $is_complex,
                'dates' => $is_complex ? [] : [$row['course_date_display']]
            ];
        }
    }

    // 2. Get complex courses (from mst_renew_other)
    $res = $render_db->query("
        SELECT o.id, p.name as pillar_name, d.course_date_display, c.name as subject_name
        FROM mst_renew_other o
        JOIN mst_renew_pillars p ON o.pillar_id = p.id
        JOIN mst_renew_dates d ON o.date_id = d.id
        JOIN mst_renew_course c ON o.subject_id = c.id
        WHERE o.status = 'active'
        ORDER BY o.display_order
    ");
    $complex_dates = [];
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $complex_dates[] = "[{$row['pillar_name']}] [{$row['course_date_display']}] : {$row['subject_name']}";
        }
    }

    // Assign complex dates to 4+ courses
    foreach ($courseScheduleData as $cat => &$courses) {
        foreach ($courses as $id => &$course) {
            if ($course['is_complex']) {
                $course['dates'] = $complex_dates;
            }
        }
    }
}
$courseScheduleJson = json_encode($courseScheduleData, JSON_UNESCAPED_UNICODE);

// Check if system is closed
if (defined('SYSTEM_IS_ONLINE') && SYSTEM_IS_ONLINE === false) {
    header("Location: closed.php");
    exit();
} elseif (defined('SYSTEM_OPEN_PERIODS')) {
    $periods = json_decode(SYSTEM_OPEN_PERIODS, true);
    if (is_array($periods) && count($periods) > 0) {
        date_default_timezone_set('Asia/Bangkok');
        $now = new DateTime();
        $isClosed = true;

        foreach ($periods as $period) {
            $openValid = true;
            $closeValid = true;

            if (!empty($period['open'])) {
                $openDate = new DateTime($period['open']);
                if ($now < $openDate) {
                    $openValid = false;
                }
            }

            if (!empty($period['close'])) {
                $closeDate = new DateTime($period['close']);
                if ($now >= $closeDate) {
                    $closeValid = false;
                }
            }

            if ($openValid && $closeValid) {
                $isClosed = false;
                break;
            }
        }

        if ($isClosed) {
            header("Location: closed.php");
            exit();
        }
    }
}

// ========================
// Validate Thai ID (13 digits + checksum)
// ========================
function isValidThaiID($id) {
    if (!preg_match('/^[0-9]{13}$/', $id)) return false;

    $sum = 0;
    for ($i = 0; $i < 12; $i++) {
        $sum += intval($id[$i]) * (13 - $i);
    }
    $check = (11 - ($sum % 11)) % 10;

    return $check === intval($id[12]);
}

// ========================
// Init vars
// ========================
$error   = '';
$success = '';

// POST field defaults
$formData = array();
$fieldNames = array(
    'pdpaConsent','idCard','idCardExpiry','titleName','titleNameOther',
    'firstNameTh','middleNameTh','lastNameTh','firstNameEn','middleNameEn','lastNameEn',
    'hasChangedName','titleNamePrev','titleNameOtherPrev',
    'firstNameThPrev','middleNameThPrev','lastNameThPrev',
    'firstNameEnPrev','middleNameEnPrev','lastNameEnPrev',
    'birthDate','religion','gender','bloodGroup','phone','email',
    'lineId','facebook','instagram','foodAllergy','chronicDisease',
    'emergencyContactName','emergencyContactPhone',
    'houseNo','moo','village','soi','road','province','district','subDistrict','zipcode',
    'shippingAddress','shipHouseNo','shipMoo','shipVillage','shipSoi','shipRoad',
    'shipProvince','shipDistrict','shipSubDistrict','shipZipcode',
    'agentType','licenseStatus','licenseNo','licenseIssue','licenseExpire',
    'agentRegion','agentBranch',
    'courseType','trainingDate','trainingFormat',
    'education','occupation','branchRecommender',
    'hasExperience','expectation','certifyTrue'
);
foreach ($fieldNames as $fn) {
    if ($fn === 'trainingDate') {
        if (isset($_POST[$fn])) {
            $formData[$fn] = is_array($_POST[$fn]) ? implode(', ', $_POST[$fn]) : trim($_POST[$fn]);
        } else {
            $formData[$fn] = '';
        }
    } else {
        $formData[$fn] = isset($_POST[$fn]) ? trim($_POST[$fn]) : '';
    }
}

// Checkbox arrays
$deductionPrivilege = isset($_POST['deductionPrivilege']) ? $_POST['deductionPrivilege'] : array();
$previousCourses    = isset($_POST['previousCourses'])    ? $_POST['previousCourses']    : array();

// ========================
// Submit handler
// ========================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // --- Validate ID Card ---
    $idRaw = preg_replace('/[^0-9]/', '', $formData['idCard']);
    if ($idRaw === '') {
        $error = "กรุณากรอกเลขบัตรประชาชน";
    } elseif (!preg_match('/^[0-9]{13}$/', $idRaw)) {
        $error = "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลักเท่านั้น";
    } elseif (!isValidThaiID($idRaw)) {
        $error = "เลขบัตรประชาชนไม่ถูกต้องตามรูปแบบราชการ";
    }

    // --- Validate Phone ---
    if ($error === '') {
        $phoneRaw = preg_replace('/[^0-9]/', '', $formData['phone']);
        if ($phoneRaw === '') {
            $error = "กรุณากรอกหมายเลขโทรศัพท์มือถือ";
        } elseif (strlen($phoneRaw) != 10 || substr($phoneRaw, 0, 1) !== '0') {
            $error = "หมายเลขโทรศัพท์มือถือต้องมี 10 หลักและขึ้นต้นด้วย 0 เท่านั้น";
        }
    }

    // --- Validate Email ---
    if ($error === '' && $formData['email'] === '') {
        $error = "กรุณากรอกอีเมล";
    }

    // --- Insert to DB ---
    // --- Format Date for DB ---
    $dbIdCardExpiry = null;
    if (!empty($formData['idCardExpiry'])) {
        $parts = explode('/', $formData['idCardExpiry']);
        if (count($parts) === 3) {
            $year = (int)$parts[2];
            if ($year > 2400) $year -= 543;
            $dbIdCardExpiry = $year . '-' . $parts[1] . '-' . $parts[0];
        }
    }

    $dbBirthDate = null;
    if (!empty($formData['birthDate'])) {
        $parts = explode('/', $formData['birthDate']);
        if (count($parts) === 3) {
            $year = (int)$parts[2];
            if ($year > 2400) $year -= 543;
            $dbBirthDate = $year . '-' . $parts[1] . '-' . $parts[0];
            
            $bday = new DateTime($dbBirthDate);
            $today = new DateTime('today');
            if ($today->diff($bday)->y < 20) {
                $error = "วัน/เดือน/ปี เกิด ต้องมากกว่า 20 นับจากวันที่ปัจจุบันเท่านั้น";
            }
        }
    }

    $dbLicenseIssue = null;
    if (!empty($formData['licenseIssue'])) {
        $parts = explode('/', $formData['licenseIssue']);
        if (count($parts) === 3) {
            $year = (int)$parts[2];
            if ($year > 2400) $year -= 543;
            $dbLicenseIssue = $year . '-' . $parts[1] . '-' . $parts[0];
        }
    }

    $dbLicenseExpire = null;
    if (!empty($formData['licenseExpire'])) {
        $parts = explode('/', $formData['licenseExpire']);
        if (count($parts) === 3) {
            $year = (int)$parts[2];
            if ($year > 2400) $year -= 543;
            $dbLicenseExpire = $year . '-' . $parts[1] . '-' . $parts[0];
        }
    }

    if ($error === '') {

        $db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($db->connect_errno) {
            $error = "เชื่อมต่อฐานข้อมูลไม่สำเร็จ: " . $db->connect_error;
        } else {
            $db->set_charset("utf8mb4");
            $db->begin_transaction();

            try {
                $sql = "INSERT INTO " . DB_TABLE_REGISTER . " (
                    pdpa_consent, national_id, id_card_expiry,
                    title_th, title_custom,
                    first_name_th, middle_name_th, last_name_th,
                    first_name_en, middle_name_en, last_name_en,
                    has_changed_name, title_prev, title_custom_prev,
                    first_name_old_th, middle_name_old_th, last_name_old_th,
                    first_name_en_prev, middle_name_en_prev, last_name_en_prev,
                    birth_date, religion, gender, blood_group,
                    phone_otp, email_alt, email,
                    line_id, facebook, instagram,
                    food_allergy, medical_condition,
                    emergency_contact_name, emergency_contact_phone,
                    addr_house_no, addr_moo, addr_village, addr_soi, addr_road,
                    addr_province, addr_district, addr_subdistrict, addr_postcode,
                    shipping_address,
                    ship_house_no, ship_moo, ship_village, ship_soi, ship_road,
                    ship_province, ship_district, ship_subdistrict, ship_postcode,
                    agent_type, license_status, license_no, license_issue_date, license_expiry_date,
                    agent_region, agent_branch,
                    course_type, training_date, training_format,
                    deduction_privilege, previous_courses,
                    highest_education, occupation, branch_recommender,
                    has_experience, expectation, certify_true, start_time, completion_time
                ) VALUES (
                    ?, ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    NOW()
                )";

                $stmt = $db->prepare($sql);
                if (!$stmt) throw new Exception("เตรียมคำสั่ง INSERT ไม่สำเร็จ: " . $db->error);

                $deductStr = implode(',', $deductionPrivilege);
                $coursesStr = implode(',', $previousCourses);
                $emergPhone = preg_replace('/[^0-9]/', '', $formData['emergencyContactPhone']);

                if (($formData['titleName'] === '4' || $formData['titleName'] === 'อื่นๆ') && $formData['titleNameOther'] !== '') {
                    $formData['titleName'] = $formData['titleNameOther'];
                }
                if (($formData['titleNamePrev'] === '4' || $formData['titleNamePrev'] === 'อื่นๆ') && $formData['titleNameOtherPrev'] !== '') {
                    $formData['titleNamePrev'] = $formData['titleNameOtherPrev'];
                }

                $stmt->bind_param("ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss",
                    $formData['pdpaConsent'], $idRaw, $dbIdCardExpiry,
                    $formData['titleName'], $formData['titleNameOther'],
                    $formData['firstNameTh'], $formData['middleNameTh'], $formData['lastNameTh'],
                    $formData['firstNameEn'], $formData['middleNameEn'], $formData['lastNameEn'],
                    $formData['hasChangedName'], $formData['titleNamePrev'], $formData['titleNameOtherPrev'],
                    $formData['firstNameThPrev'], $formData['middleNameThPrev'], $formData['lastNameThPrev'],
                    $formData['firstNameEnPrev'], $formData['middleNameEnPrev'], $formData['lastNameEnPrev'],
                    $dbBirthDate, $formData['religion'], $formData['gender'], $formData['bloodGroup'],
                    $phoneRaw, $formData['email'], $formData['email'],
                    $formData['lineId'], $formData['facebook'], $formData['instagram'],
                    $formData['foodAllergy'], $formData['chronicDisease'],
                    $formData['emergencyContactName'], $emergPhone,
                    $formData['houseNo'], $formData['moo'], $formData['village'], $formData['soi'], $formData['road'],
                    $formData['province'], $formData['district'], $formData['subDistrict'], $formData['zipcode'],
                    $formData['shippingAddress'],
                    $formData['shipHouseNo'], $formData['shipMoo'], $formData['shipVillage'], $formData['shipSoi'], $formData['shipRoad'],
                    $formData['shipProvince'], $formData['shipDistrict'], $formData['shipSubDistrict'], $formData['shipZipcode'],
                    $formData['agentType'], $formData['licenseStatus'], $formData['licenseNo'], $dbLicenseIssue, $dbLicenseExpire,
                    $formData['agentRegion'], $formData['agentBranch'],
                    $formData['courseType'], $formData['trainingDate'], $formData['trainingFormat'],
                    $deductStr, $coursesStr,
                    $formData['education'], $formData['occupation'], $formData['branchRecommender'],
                    $formData['hasExperience'], $formData['expectation'], $formData['certifyTrue']
                );

                if (!$stmt->execute()) throw new Exception("บันทึกข้อมูลไม่สำเร็จ: " . $stmt->error);
                $stmt->close();

                $db->commit();
                $success = "ลงทะเบียนสำเร็จ! ระบบได้รับข้อมูลของคุณเรียบร้อยแล้ว (ID: {$idRaw})";

                // Clear form data after success
                foreach ($fieldNames as $fn) {
                    $formData[$fn] = '';
                }
                $deductionPrivilege = array();
                $previousCourses = array();

            } catch (Exception $e) {
                $db->rollback();
                $error = $e->getMessage();
            }

            $db->close();
        }
    }
}

// Helper function for escaping output
function e($val) {
    return htmlspecialchars($val, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>แบบฟอร์มลงทะเบียนอบรม - วิริยะประกันภัย</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <style>
        :root {
            /* Viriyah CI Colors */
            --primary-color: #0033A2;
            /* Deep Blue */
            --primary-light: #1A54D6;
            --secondary-color: #FCAF17;
            /* Gold/Yellow */
            --secondary-hover: #D98C04;
            --bg-color: #F4F7F6;
            --text-main: #333333;
            --text-muted: #666666;
            --border-color: #DDDDDD;
            --white: #FFFFFF;
            --error-color: #D32F2F;
            --success-color: #388E3C;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Sarabun', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
        }

        .header {
            position: relative;
            background: linear-gradient(135deg, var(--primary-color) 0%, #003B6F 100%);
            color: var(--white);
            padding: 40px 20px;
            text-align: center;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            border-bottom: 5px solid var(--secondary-color);
        }

        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .header p {
            font-weight: 300;
            opacity: 0.9;
        }

        .container {
            max-width: 800px;
            margin: -30px auto 50px;
            background: var(--white);
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
            position: relative;
            z-index: 10;
        }

        /* Step Indicator */
        .step-indicator {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            position: relative;
        }

        .step-indicator::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 3px;
            background-color: var(--border-color);
            z-index: 1;
            transform: translateY(-50%);
        }

        .step-dot {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background-color: var(--white);
            border: 3px solid var(--border-color);
            color: var(--text-muted);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            z-index: 2;
            position: relative;
            transition: all 0.3s ease;
        }

        .step-dot.active {
            border-color: var(--primary-color);
            background-color: var(--primary-color);
            color: var(--white);
            box-shadow: 0 0 0 4px rgba(0, 90, 156, 0.2);
        }

        .step-dot.finish {
            border-color: var(--secondary-color);
            background-color: var(--secondary-color);
            color: var(--white);
        }

        /* Form Sections */
        .tab {
            display: none;
            animation: fadeIn 0.5s;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .tab-title {
            color: var(--primary-color);
            font-size: 22px;
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: var(--text-main);
        }

        .required::after {
            content: ' *';
            color: var(--error-color);
        }

        .form-control {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            font-family: 'Sarabun', sans-serif;
            font-size: 15px;
            transition: border-color 0.3s, box-shadow 0.3s;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(0, 90, 156, 0.1);
        }

        .form-control.invalid {
            border-color: var(--error-color);
            background-color: #FFEBEE;
        }

        /* เมื่อ focus ที่ช่อง invalid → เปลี่ยนเป็นสีน้ำเงินทันที */
        .form-control.invalid:focus {
            border-color: var(--primary-color);
            background-color: #fff;
            box-shadow: 0 0 0 3px rgba(0, 90, 156, 0.1);
        }

        /* เมื่อกรอกข้อมูลแล้ว (browser ตั้งเป็น :valid) → ลบสีแดงอัตโนมัติ */
        .form-control.invalid:valid {
            border-color: var(--border-color);
            background-color: #fff;
        }

        /* Autocomplete dropdown */
        .autocomplete-wrapper { position: relative; }
        .autocomplete-list {
            position: absolute; top: 100%; left: 0; right: 0; z-index: 999;
            max-height: 300px; overflow-y: auto;
            background: #fff; border: 1px solid var(--border-color);
            border-top: none; border-radius: 0 0 8px 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: none;
        }
        .autocomplete-list.show { display: block; }
        .autocomplete-item {
            padding: 10px 15px; cursor: pointer;
            font-size: 15px; transition: background 0.15s;
        }
        .autocomplete-item:hover, .autocomplete-item.active {
            background: #E3F2FD; color: var(--primary-color);
        }

        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
        }

        /* Radio & Checkbox Styles */
        .radio-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 5px;
        }

        .radio-item {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            padding: 12px 15px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            transition: all 0.2s ease;
            background-color: var(--white);
        }

        .radio-item:hover {
            background-color: #F8F9FA;
            border-color: #bbbbbb;
        }

        .radio-item.invalid {
            border-color: var(--error-color);
            background-color: #FFEBEE;
        }

        .radio-item:has(input:checked) {
            border-color: var(--primary-color);
            background-color: rgba(0, 90, 156, 0.04);
            box-shadow: 0 0 0 1px var(--primary-color);
        }

        .radio-item input[type="radio"],
        .radio-item input[type="checkbox"] {
            width: 20px;
            height: 20px;
            accent-color: var(--primary-color);
            cursor: pointer;
            margin: 0;
        }

        /* Policy Box */
        .policy-box {
            margin-bottom: 20px;
            font-size: 14px;
            color: var(--text-muted);
        }

        /* Navigation Buttons */
        .btn-container {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color);
        }

        .btn {
            padding: 12px 30px;
            font-family: 'Sarabun', sans-serif;
            font-size: 16px;
            font-weight: 500;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn-prev {
            background-color: #E9ECEF;
            color: var(--text-main);
        }

        .btn-prev:hover {
            background-color: #DDE2E5;
        }

        .btn-next,
        .btn-submit {
            background-color: var(--primary-color);
            color: var(--white);
            margin-left: auto;
        }

        .btn-next:hover,
        .btn-submit:hover {
            background-color: var(--primary-light);
            box-shadow: 0 4px 10px rgba(26, 115, 232, 0.3);
        }

        /* Address Card */
        .address-card {
            border: 1px solid var(--border-color);
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            margin-bottom: 10px;
            transition: box-shadow 0.3s ease;
        }

        .address-card:hover {
            box-shadow: 0 4px 16px rgba(0, 90, 156, 0.10);
        }

        .address-card-header {
            background: linear-gradient(135deg, var(--primary-color) 0%, #003B6F 100%);
            color: var(--white);
            padding: 14px 20px;
            font-size: 16px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
            border-radius: 9px 9px 0 0;
        }

        .address-card-header i {
            font-size: 18px;
            opacity: 0.9;
        }

        .address-card-body {
            padding: 25px 20px 10px;
            background-color: #FAFBFC;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                max-height: 0;
                transform: translateY(-10px);
            }

            to {
                opacity: 1;
                max-height: 800px;
                transform: translateY(0);
            }
        }

        .address-card.reveal {
            animation: slideDown 0.4s ease forwards;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .container {
                margin: 20px;
                padding: 20px;
            }

            .grid-2,
            .grid-3 {
                grid-template-columns: 1fr;
                gap: 15px;
            }

            .address-card-body {
                padding: 15px 12px 5px;
            }
        }

        /* ===== Success / Next-Steps Page ===== */
        .success-page {
            padding: 10px 0 20px;
        }
        .success-hero {
            text-align: center;
            padding: 30px 20px 24px;
            background: linear-gradient(135deg, var(--primary-color) 0%, #003B6F 100%);
            border-radius: 12px;
            color: #fff;
            margin-bottom: 28px;
            border-bottom: 4px solid var(--secondary-color);
        }
        .success-icon-wrap {
            font-size: 56px;
            color: var(--secondary-color);
            margin-bottom: 14px;
            animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes popIn {
            from { transform: scale(0); opacity: 0; }
            to   { transform: scale(1); opacity: 1; }
        }
        .success-hero h2 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .success-subtitle {
            font-size: 15px;
            opacity: 0.85;
            font-weight: 300;
        }
        .next-steps-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 18px;
            text-align: center;
            letter-spacing: 0.3px;
        }
        .steps-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .step-card {
            display: flex;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.07);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            animation: fadeSlideIn 0.4s ease both;
        }
        .step-card:nth-child(1) { animation-delay: 0.05s; }
        .step-card:nth-child(2) { animation-delay: 0.15s; }
        .step-card:nth-child(3) { animation-delay: 0.25s; }
        @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .step-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .step-card__num {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 52px;
            font-size: 22px;
            font-weight: 800;
            color: #fff;
        }
        .step-card--primary .step-card__num  { background: var(--primary-color); }
        .step-card--secondary .step-card__num { background: #6366F1; }
        .step-card--success .step-card__num   { background: var(--success-color); }
        .step-card__body {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 20px 22px;
            background: #fff;
            flex: 1;
        }
        .step-card__icon {
            font-size: 28px;
            min-width: 36px;
            padding-top: 2px;
        }
        .step-card--primary   .step-card__icon { color: var(--primary-color); }
        .step-card--secondary .step-card__icon { color: #6366F1; }
        .step-card--success   .step-card__icon { color: var(--success-color); }
        .step-card__content h3 {
            font-size: 17px;
            font-weight: 600;
            color: var(--text-main);
            margin-bottom: 6px;
        }
        .step-card__content p {
            font-size: 14px;
            color: var(--text-muted);
            line-height: 1.6;
            margin-bottom: 14px;
        }
        .btn-step-action {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 22px;
            border-radius: 6px;
            font-family: 'Sarabun', sans-serif;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            background: var(--primary-color);
            color: #fff;
            transition: all 0.2s ease;
            box-shadow: 0 3px 10px rgba(0,90,156,0.3);
        }
        .btn-step-action:hover {
            background: var(--primary-light);
            box-shadow: 0 5px 16px rgba(26,115,232,0.4);
            transform: translateX(2px);
        }
        .btn-step-action--outline {
            background: transparent;
            color: #6366F1;
            border: 2px solid #6366F1;
            box-shadow: none;
        }
        .btn-step-action--outline:hover {
            background: #6366F1;
            color: #fff;
            transform: translateX(2px);
        }
        @media (max-width: 600px) {
            .step-card__body { padding: 16px 14px; gap: 12px; }
            .step-card__icon { font-size: 22px; min-width: 28px; }
            .step-card__num  { min-width: 42px; font-size: 18px; }
        }
        @keyframes slideInToast {
            from { opacity: 0; transform: translateX(40px); }
            to   { opacity: 1; transform: translateX(0); }
        }
    </style>
</head>

<body>

    <header class="header">
        <img src="logo.jpg" alt="V Online Learning" style="position: absolute; left: 30px; top: 50%; transform: translateY(-50%); max-height: 60px; background: #ffffff; padding: 5px 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
        <h1>ลงทะเบียนอบรมวิริยะประกันภัย</h1>
        <p>ฟอร์มลงทะเบียนตัวแทนและนายหน้า (ระบบออนไลน์)</p>
    </header>

    <div class="container">
        <!-- Step Indicators -->
        <div class="step-indicator" id="stepIndicator">
            <div class="step-dot">1</div>
            <div class="step-dot">2</div>
            <div class="step-dot">3</div>
            <div class="step-dot">4</div>
            <div class="step-dot">5</div>
            <div class="step-dot">6</div>
        </div>

        <!-- ===== SUCCESS / NEXT STEPS PAGE (hidden by default, shown by JS) ===== -->
        <div class="success-page" id="successPage" style="display:none;">

            <div class="success-hero">
                <h2>ขั้นตอนถัดไป — กรุณาดำเนินการตามลำดับด้านล่าง</h2>
                <p class="success-subtitle">ระบบได้รับข้อมูลการลงทะเบียนของท่านเรียบร้อยแล้ว</p>
            </div>

            <div class="steps-list">

                <!-- Step 1: Upload -->
                <div class="step-card step-card--primary">
                    <div class="step-card__num">1</div>
                    <div class="step-card__body">
                        <div class="step-card__icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                        <div class="step-card__content">
                            <h3>อัปโหลดภาพประกอบการลงทะเบียน</h3>
                            <p>กรุณาอัปโหลดภาพเอกสารประกอบการลงทะเบียน เช่น รูปถ่ายหน้าบัตรประชาชน, ใบอนุญาต เป็นต้น</p>
                            <a href="index-round2.php" id="uploadLinkBtn" class="btn-step-action" target="_blank">
                                <i class="fa-solid fa-arrow-right"></i> ไปอัปโหลดเอกสาร
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Check data -->
                <div class="step-card step-card--secondary">
                    <div class="step-card__num">2</div>
                    <div class="step-card__body">
                        <div class="step-card__icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                        <div class="step-card__content">
                            <h3>ตรวจสอบข้อมูลที่ลงทะเบียน</h3>
                            <p>ท่านสามารถตรวจสอบข้อมูลที่กรอกไว้ได้ทุกเมื่อต้องการ หากพบข้อผิดพลาดกรุณาติดต่อเจ้าหน้าที่</p>
                            <a href="#" id="checkInfoBtn" class="btn-step-action btn-step-action--outline" target="_blank">
                                <i class="fa-solid fa-list-check"></i> ตรวจสอบข้อมูล
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Step 3: Thank you -->
                <div class="step-card step-card--success">
                    <div class="step-card__num">3</div>
                    <div class="step-card__body">
                        <div class="step-card__icon"><i class="fa-solid fa-heart"></i></div>
                        <div class="step-card__content">
                            <h3>ขอบคุณที่ให้ความไว้วางใจ</h3>
                            <p>ศูนย์ฝึกอบรมและพัฒนานักประกันภัย บมจ.วิริยะประกันภัย ขอขอบคุณเป็นอย่างสูงในความร่วมมือ และยินดีต้อนรับท่านในการอบรม</p>
                        </div>
                    </div>
                </div>

            </div>

        </div>
        <!-- ===== / SUCCESS PAGE ===== -->

        <form id="regForm" method="POST" action="index.php" onsubmit="event.preventDefault(); submitForm();">

            <?php if ($error !== ''): ?>
                <div class="alert alert-error" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; border-radius:10px; padding:14px; margin-bottom:16px; font-weight:600;">
                    ⚠️ <?php echo e($error); ?>
                </div>
            <?php endif; ?>

            <!-- Step 1: นโยบายความเป็นส่วนตัว -->
            <div class="tab">
                <h2 class="tab-title"><i class="fa-solid fa-file-contract"></i> 1. นโยบายความเป็นส่วนตัว (PDPA)</h2>

                <div class="form-group">
                    <label>คำประกาศความเป็นส่วนตัว (Privacy Notice)</label>
                    <div class="policy-box">
                        <p><strong>เรียน ผู้เข้าอบรมทุกท่าน</strong></p>
                        <br>
                        <p>ศูนย์ฝึกอบรมและพัฒนานักประกันภัย บมจ.วิริยะประกันภัย
                            ใคร่แจ้งให้ท่านทราบว่าท่านจำเป็นต้องตรวจสอบประวัติการอบรมของท่านผ่านระบบ e-Licensing ของสำนักงาน คปภ. ก่อนดำเนินการในขั้นตอนต่อไป
                        </p>
                        <p>การลงทะเบียนเพื่อเข้ารับการอบรมในปี 2569
                            โดยขอให้กรอกประวัติการอบรมที่ละเอียด ถูกต้อง และข้อมูลอื่น ๆ
                            ซึ่งอาจรวมถึงข้อมูลส่วนบุคคลบางประเภทที่มีความอ่อนไหว (Sensitive Personal Data)
                            อย่างไรก็ตาม ศูนย์ฝึกอบรมฯ ขอให้ท่านมั่นใจว่า ข้อมูลทั้งหมดจะถูกจัดเก็บ
                            ใช้ด้วยความระมัดระวัง และคำนึงถึงความปลอดภัยสูงสุด ภายใต้นโยบายคุ้มครองข้อมูลส่วนบุคคล
                            (PDPA)
                            และจะไม่เปิดเผยต่อบุคคลภายนอกคามนโยบายการกำกับดูแลข้อมูลฯ ของบริษัทฯ</p><br>
                        <p>การลงทะเบียนครั้งนี้ ขอให้ท่านกรอกข้อมูลด้วยความถูกต้อง
                            การให้ข้อมูลที่คลาดเคลื่อนหรือไม่ถูกต้องจะส่งผลให้ระบบของ สำนักงาน คปภ. ปฏิเสธข้อมูลของท่าน
                            และทำให้ท่านเสียประโยชน์ </p>
                        <br>
                        <p>ท่านที่ดำเนินการตามขั้นตอนที่ครบถ้วนตามที่แจ้งด้านล่าง
                            จะได้รับการจัดสรรที่นั่งสำหรับการอบรมตามวันและเวลา
                            ของการบันทึกในระบบ</p><br>
                        <br>
                        <p><strong>*** ท่านที่ดำเนินการเรียบร้อยภายในเวลาที่กำหนดเท่านั้น
                                จึงจะได้รับการจัดสรรที่นั่งอบรมให้ในปี 2569 ***</strong></p>
                        <br>
                        <p>หากท่านมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม กรุณาติดต่อ ผ่าน Line Official Account :
                            @viriyahiptc หรือ <a href="https://lin.ee/4k6FJ6g" target="_blank" style="color: var(--primary-color); text-decoration: underline;">https://lin.ee/4k6FJ6g</a></p><br>
                        <br>
                        <p>ศูนย์ฝึกอบรมฯ ยินดีให้คำแนะนำและอำนวยความสะดวกแก่ท่านในทุกขั้นตอน
                            และขอขอบพระคุณเป็นอย่างสูงในความร่วมมือและความไว้วางใจที่มีต่อ
                            ศูนย์ฝึกอบรมและพัฒนานักประกันภัย บมจ.วิริยะประกันภัย โดยเสมอมา</p><br>
                        <br>
                        <p>ขอแสดงความนับถือ</p><br>
                        <p>ศูนย์ฝึกอบรมและพัฒนานักประกันภัย <br>บมจ.วิริยะประกันภัย</p>
                    </div>
                </div>

                <div class="form-group">
                    <label class="required">รับทราบ</label>
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" name="pdpaConsent" value="accept" required onchange="checkPDPA()">
                            ข้าพเจ้าได้อ่านและรับทราบนโยบายคุ้มครองข้อมูลส่วนบุคคล
                        </label>
                    </div>
                </div>
            </div>

            <!-- Step 2: ข้อมูลส่วนบุคคล -->
            <div class="tab">
                <h2 class="tab-title"><i class="fa-solid fa-user"></i> 2. ข้อมูลส่วนบุคคล</h2>

                <div class="grid-2">
                    <div class="form-group">
                        <label class="required">เลขประจำตัวประชาชน (13 หลัก)</label>
                        <input type="text" class="form-control" name="idCard" placeholder="x-xxxx-xxxxx-xx-x"
                            maxlength="17" required oninput="formatIdCard(this)" value="<?php echo e($formData['idCard']); ?>">
                    </div>
                    <div class="form-group">
                        <label class="required">วันหมดอายุบัตรประชาชน</label>
                        <input type="text" class="form-control datepicker" name="idCardExpiry" placeholder="DD/MM/YYYY" required value="<?php echo e($formData['idCardExpiry']); ?>">
                        <small style="color: var(--text-muted); display: block; margin-top: 5px;">* บัตรประชาชนตลอดชีพ ให้กรอกเป็นวันที่ 31 ธันวาคม 2599</small>
                    </div>
                </div>

                <hr style="border: 1px solid var(--border-color); margin: 30px 0;">
                <h3 style="color: var(--primary-color); margin-bottom: 20px; font-size: 18px;"><i
                        class="fa-solid fa-address-card"></i> ข้อมูลชื่อ-นามสกุล (ปัจจุบัน) เป็นภาษาไทยเท่านั้น</h3>

                <div class="form-group">
                    <label class="required">คำนำหน้าชื่อ</label>
                    <select class="form-control" name="titleName" required onchange="toggleTitleNameOther()"><?php echo getOptionsHtml($render_db, "mst_titles", isset($formData["titleName"]) ? $formData["titleName"] : ""); ?></select>
                    <div id="titleNameOtherContainer" style="display:none; margin-top: 10px;">
                        <label class="required" style="font-size: 14px;">คำนำหน้าตามบัตรประชาชน (โปรดระบุ)</label>
                        <input type="text" class="form-control" name="titleNameOther" id="titleNameOther"
                            placeholder="ใส่คำตอบ">
                    </div>
                </div>

                <div class="grid-3">
                    <div class="form-group">
                        <label class="required">ชื่อ</label>
                        <input type="text" class="form-control" name="firstNameTh" placeholder="สมชาย" required value="<?php echo e($formData['firstNameTh']); ?>">
                    </div>
                    <div class="form-group">
                        <label>ชื่อกลาง (ตามบัตรประชาชน)</label>
                        <input type="text" class="form-control" name="middleNameTh" placeholder="ถ้ามี" value="<?php echo e($formData['middleNameTh']); ?>">
                    </div>
                    <div class="form-group">
                        <label class="required">นามสกุล</label>
                        <input type="text" class="form-control" name="lastNameTh" placeholder="ใจดี" required value="<?php echo e($formData['lastNameTh']); ?>">
                    </div>
                </div>

                <!-- <div class="grid-3">
                    <div class="form-group">
                        <label class="required">ชื่อ (ภาษาอังกฤษ) (ปัจจุบัน)</label>
                        <input type="text" class="form-control" name="firstNameEn" placeholder="Somchai" required value="<?php echo e($formData['firstNameEn']); ?>">
                    </div>
                    <div class="form-group">
                        <label>ชื่อกลาง (ภาษาอังกฤษ) (ปัจจุบัน)</label>
                        <input type="text" class="form-control" name="middleNameEn" placeholder="Optional" value="<?php echo e($formData['middleNameEn']); ?>">
                    </div>
                    <div class="form-group">
                        <label class="required">นามสกุล (ภาษาอังกฤษ) (ปัจจุบัน)</label>
                        <input type="text" class="form-control" name="lastNameEn" placeholder="Jaidee" required value="<?php echo e($formData['lastNameEn']); ?>">
                    </div>
                </div> -->

                <hr style="border: 1px solid var(--border-color); margin: 30px 0;">

                <div class="form-group">
                    <label class="required">ท่านเคยเปลี่ยนชื่อหรือนามสกุลหรือไม่?</label>
                    <div class="radio-group">
                        <label class="radio-item"><input type="radio" name="hasChangedName" value="no" checked
                                onchange="togglePreviousName()"> ไม่เคยเปลี่ยน</label>
                        <label class="radio-item"><input type="radio" name="hasChangedName" value="yes"
                                onchange="togglePreviousName()"> เคยเปลี่ยน</label>
                    </div>
                </div>

                <div id="previousNameSection"
                    style="display: none; background-color: #F8F9FA; padding: 20px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                    <h3 style="color: var(--primary-color); margin-bottom: 20px; font-size: 18px;"><i
                            class="fa-solid fa-clock-rotate-left"></i> ข้อมูลชื่อ-นามสกุล (เดิม)</h3>

                    <div class="form-group">
                        <label class="required">คำนำหน้าชื่อ</label>
                        <select class="form-control" name="titleNamePrev" id="titleNamePrev"
                            onchange="toggleTitleNameOtherPrev()"><?php echo getOptionsHtml($render_db, "mst_titles", isset($formData["titleNamePrev"]) ? $formData["titleNamePrev"] : ""); ?></select>
                        <div id="titleNameOtherContainerPrev" style="display:none; margin-top: 10px;">
                            <label class="required" style="font-size: 14px;">คำนำหน้าตามบัตรประชาชน (โปรดระบุ)</label>
                            <input type="text" class="form-control" name="titleNameOtherPrev" id="titleNameOtherPrev"
                                placeholder="ใส่คำตอบ">
                        </div>
                    </div>

                    <div class="grid-3">
                        <div class="form-group">
                            <label class="required">ชื่อ</label>
                            <input type="text" class="form-control" name="firstNameThPrev" id="firstNameThPrev"
                                placeholder="ชื่อเดิม">
                        </div>
                        <div class="form-group">
                            <label>ชื่อกลาง (ตามบัตรประชาชน)</label>
                            <input type="text" class="form-control" name="middleNameThPrev" id="middleNameThPrev" placeholder="ถ้ามี">
                        </div>
                        <div class="form-group">
                            <label class="required">นามสกุล</label>
                            <input type="text" class="form-control" name="lastNameThPrev" id="lastNameThPrev"
                                placeholder="นามสกุลเดิม">
                        </div>
                    </div>

                    <!-- <div class="grid-3">
                        <div class="form-group">
                            <label class="required">ชื่อ (ภาษาอังกฤษ) (เดิม)</label>
                            <input type="text" class="form-control" name="firstNameEnPrev" id="firstNameEnPrev"
                                placeholder="Previous First Name">
                        </div>
                        <div class="form-group">
                            <label>ชื่อกลาง (ภาษาอังกฤษ) (เดิม)</label>
                            <input type="text" class="form-control" name="middleNameEnPrev" id="middleNameEnPrev" placeholder="Optional">
                        </div>
                        <div class="form-group">
                            <label class="required">นามสกุล (ภาษาอังกฤษ) (เดิม)</label>
                            <input type="text" class="form-control" name="lastNameEnPrev" id="lastNameEnPrev"
                                placeholder="Previous Last Name">
                        </div>
                    </div> -->
                </div>

                <div class="grid-2">
                    <div class="form-group">
                        <label>วัน/เดือน/ปี เกิด</label>
                        <input type="text" class="form-control datepicker" name="birthDate" placeholder="DD/MM/YYYY" value="<?php echo e($formData['birthDate']); ?>">
                    </div>
                    <div class="form-group">
                        <label>ศาสนา</label>
                        <select class="form-control" name="religion"><?php echo getOptionsHtml($render_db, "mst_religion", isset($formData["religion"]) ? $formData["religion"] : ""); ?></select>
                    </div>
                </div>

                <div class="grid-2">
                    <div class="form-group">
                        <label>เพศ</label>
                        <select class="form-control" name="gender"><?php echo getOptionsHtml($render_db, "mst_gender", isset($formData["gender"]) ? $formData["gender"] : ""); ?></select>
                    </div>
                    <div class="form-group">
                        <label>กรุ๊ปเลือด</label>
                        <select class="form-control" name="bloodGroup"><?php echo getOptionsHtml($render_db, "mst_blood", isset($formData["bloodGroup"]) ? $formData["bloodGroup"] : ""); ?></select>
                        <small style="color: var(--text-muted); display: block; margin-top: 5px;">* ใช้กรณีเกิดเหตุฉุกเฉินระหว่างการอบรม</small>
                    </div>
                </div>

                <div class="grid-2">
                    <div class="form-group">
                        <label class="required">หมายเลขโทรศัพท์มือถือที่รับ OTP</label>
                        <input type="tel" class="form-control" name="phone" placeholder="0xx-xxx-xxxx" maxlength="12" value="<?php echo e($formData['phone']); ?>"
                            required oninput="formatPhone(this)">
                    </div>
                    <div class="form-group">
                        <label class="required">อีเมล (E-mail)</label>
                        <input type="email" class="form-control" name="email" placeholder="example@email.com" required value="<?php echo e($formData['email']); ?>" oninput="this.value = this.value.replace(/[^a-zA-Z0-9@._-]/g, '')">
                    </div>
                </div>

                <div class="grid-3">
                    <div class="form-group">
                        <label><i class="fa-brands fa-line" style="color: #06C755;"></i> Line ID</label>
                        <input type="text" class="form-control" name="lineId" placeholder="Line ID" value="<?php echo e($formData['lineId']); ?>">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-brands fa-facebook" style="color: #1877F2;"></i> Facebook</label>
                        <input type="text" class="form-control" name="facebook" placeholder="ชื่อบัญชี Facebook" value="<?php echo e($formData['facebook']); ?>">
                    </div>
                    <div class="form-group">
                        <label><i class="fa-brands fa-instagram" style="color: #E4405F;"></i> Instagram</label>
                        <input type="text" class="form-control" name="instagram" placeholder="ชื่อบัญชี Instagram" value="<?php echo e($formData['instagram']); ?>">
                    </div>
                </div>

                <div class="grid-2">
                    <div class="form-group">
                        <label>คุณเคยมีประวัติแพ้อาหารหรือไม่ (โปรดระบุ)</label>
                        <input type="text" class="form-control" name="foodAllergy"
                            placeholder="เช่น แพ้อาหารทะเล, ถั่ว หรือ ไม่มี">
                    </div>
                    <div class="form-group">
                        <label>โรคประจำตัว (โปรดระบุ)</label>
                        <input type="text" class="form-control" name="chronicDisease"
                            placeholder="เช่น เบาหวาน, ความดัน หรือ ไม่มี">
                    </div>
                </div>

                <hr style="border: 1px solid var(--border-color); margin: 30px 0;">
                <h3 style="color: var(--primary-color); margin-bottom: 20px; font-size: 18px;"><i
                        class="fa-solid fa-phone-volume"></i> กรณีฉุกเฉิน</h3>

                <div class="grid-2">
                    <div class="form-group">
                        <label class="required">บุคคลที่สามารถติดต่อได้</label>
                        <input type="text" class="form-control" name="emergencyContactName"
                            placeholder="โปรดระบุชื่อ-นามสกุล" required>
                    </div>
                    <div class="form-group">
                        <label class="required">หมายเลขโทรศัพท์</label>
                        <input type="tel" class="form-control" name="emergencyContactPhone"
                            placeholder="โปรดระบุหมายเลขโทรศัพท์" maxlength="12" required oninput="formatPhone(this)">
                    </div>
                </div>
            </div>

            <!-- Step 3: ข้อมูลที่อยู่ -->
            <div class="tab">
                <h2 class="tab-title"><i class="fa-solid fa-map-location-dot"></i> 3. ข้อมูลที่อยู่</h2>

                <!-- ที่อยู่ตามบัตรประชาชน -->
                <div class="address-card">
                    <div class="address-card-header">
                        <i class="fa-solid fa-house-chimney"></i>
                        <span>ที่อยู่ตามบัตรประชาชน</span>
                    </div>
                    <div class="address-card-body">
                        <div class="grid-3">
                            <div class="form-group">
                                <label class="required">บ้านเลขที่</label>
                                <input type="text" class="form-control" name="houseNo" id="houseNo"
                                    placeholder="เช่น 123/45" required value="<?php echo e($formData['houseNo']); ?>">
                            </div>
                            <div class="form-group">
                                <label>หมู่</label>
                                <input type="text" class="form-control" name="moo" id="moo" placeholder="เช่น 5" value="<?php echo e($formData['moo']); ?>">
                            </div>
                            <div class="form-group">
                                <label>หมู่บ้าน/อาคาร</label>
                                <input type="text" class="form-control" name="village" id="village"
                                    placeholder="เช่น หมู่บ้านสุขสันต์" value="<?php echo e($formData['village']); ?>">
                            </div>
                        </div>

                        <div class="grid-2">
                            <div class="form-group">
                                <label>ซอย</label>
                                <input type="text" class="form-control" name="soi" id="soi" placeholder="เช่น ซอย 10" value="<?php echo e($formData['soi']); ?>">
                            </div>
                            <div class="form-group">
                                <label>ถนน</label>
                                <input type="text" class="form-control" name="road" id="road"
                                    placeholder="เช่น สุขุมวิท" value="<?php echo e($formData['road']); ?>">
                            </div>
                        </div>

                        <div class="grid-3">
                            <div class="form-group">
                                <label class="required">จังหวัด</label>
                                <div class="autocomplete-wrapper">
                                    <input type="text" class="form-control" name="province" id="province" required
                                        placeholder="พิมพ์ชื่อจังหวัด" autocomplete="off"
                                        oninput="acSearch(this,'province')" onfocus="acSearch(this,'province')" onclick="acSearch(this,'province')" value="<?php echo e($formData['province']); ?>">
                                    <div class="autocomplete-list" id="province_list"></div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="required">เขต/อำเภอ</label>
                                <div class="autocomplete-wrapper">
                                    <input type="text" class="form-control" name="district" id="district" required
                                        placeholder="พิมพ์ชื่อเขต/อำเภอ" autocomplete="off"
                                        oninput="acSearch(this,'district')" onfocus="acSearch(this,'district')" onclick="acSearch(this,'district')" value="<?php echo e($formData['district']); ?>">
                                    <div class="autocomplete-list" id="district_list"></div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="required">แขวง/ตำบล</label>
                                <div class="autocomplete-wrapper">
                                    <input type="text" class="form-control" name="subDistrict" id="subDistrict" required
                                        placeholder="พิมพ์ชื่อแขวง/ตำบล" autocomplete="off"
                                        oninput="acSearch(this,'subDistrict')" onfocus="acSearch(this,'subDistrict')" onclick="acSearch(this,'subDistrict')" value="<?php echo e($formData['subDistrict']); ?>">
                                    <div class="autocomplete-list" id="subDistrict_list"></div>
                                </div>
                            </div>
                        </div>

                        <div class="grid-2">
                            <div class="form-group">
                                <label class="required">รหัสไปรษณีย์</label>
                                <input type="text" class="form-control" name="zipcode" id="zipcode" maxlength="5"
                                    placeholder="เช่น 10110" required
                                    oninput="this.value = this.value.replace(/\D/g, '')" value="<?php echo e($formData['zipcode']); ?>">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ที่อยู่จัดส่งเอกสาร -->
                <div class="form-group" style="margin-top: 25px;">
                    <label>ที่อยู่สำหรับจัดส่งเอกสาร</label>
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" name="shippingAddress" value="same" checked
                                onchange="toggleShippingAddress()">
                            ใช้ที่อยู่เดียวกันกับทะเบียนบ้าน
                        </label>
                        <label class="radio-item">
                            <input type="radio" name="shippingAddress" value="different"
                                onchange="toggleShippingAddress()">
                            ระบุที่อยู่ใหม่
                        </label>
                    </div>
                </div>

                <div id="shippingAddressSection" class="address-card" style="display: none; margin-top: 15px;">
                    <div class="address-card-header"
                        style="background: linear-gradient(135deg, #E4A025 0%, #C98A1B 100%);">
                        <i class="fa-solid fa-truck-fast"></i>
                        <span>ที่อยู่จัดส่งเอกสาร</span>
                    </div>
                    <div class="address-card-body">
                        <div class="grid-3">
                            <div class="form-group">
                                <label class="required">บ้านเลขที่</label>
                                <input type="text" class="form-control" name="shipHouseNo" id="shipHouseNo"
                                    placeholder="เช่น 123/45" value="<?php echo e($formData['shipHouseNo']); ?>">
                            </div>
                            <div class="form-group">
                                <label>หมู่</label>
                                <input type="text" class="form-control" name="shipMoo" id="shipMoo"
                                    placeholder="เช่น 5" value="<?php echo e($formData['shipMoo']); ?>">
                            </div>
                            <div class="form-group">
                                <label>หมู่บ้าน/อาคาร</label>
                                <input type="text" class="form-control" name="shipVillage" id="shipVillage"
                                    placeholder="เช่น หมู่บ้านสุขสันต์" value="<?php echo e($formData['shipVillage']); ?>">
                            </div>
                        </div>

                        <div class="grid-2">
                            <div class="form-group">
                                <label>ซอย</label>
                                <input type="text" class="form-control" name="shipSoi" id="shipSoi"
                                    placeholder="เช่น ซอย 10" value="<?php echo e($formData['shipSoi']); ?>">
                            </div>
                            <div class="form-group">
                                <label>ถนน</label>
                                <input type="text" class="form-control" name="shipRoad" id="shipRoad"
                                    placeholder="เช่น สุขุมวิท" value="<?php echo e($formData['shipRoad']); ?>">
                            </div>
                        </div>

                        <div class="grid-3">
                            <div class="form-group">
                                <label class="required">จังหวัด</label>
                                <div class="autocomplete-wrapper">
                                    <input type="text" class="form-control" name="shipProvince" id="shipProvince"
                                        placeholder="พิมพ์ชื่อจังหวัด" autocomplete="off"
                                        oninput="acSearch(this,'province','ship')" onfocus="acSearch(this,'province','ship')" onclick="acSearch(this,'province','ship')" value="<?php echo e($formData['shipProvince']); ?>">
                                    <div class="autocomplete-list" id="shipProvince_list"></div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="required">เขต/อำเภอ</label>
                                <div class="autocomplete-wrapper">
                                    <input type="text" class="form-control" name="shipDistrict" id="shipDistrict"
                                        placeholder="พิมพ์ชื่อเขต/อำเภอ" autocomplete="off"
                                        oninput="acSearch(this,'district','ship')" onfocus="acSearch(this,'district','ship')" onclick="acSearch(this,'district','ship')" value="<?php echo e($formData['shipDistrict']); ?>">
                                    <div class="autocomplete-list" id="shipDistrict_list"></div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="required">แขวง/ตำบล</label>
                                <div class="autocomplete-wrapper">
                                    <input type="text" class="form-control" name="shipSubDistrict" id="shipSubDistrict"
                                        placeholder="พิมพ์ชื่อแขวง/ตำบล" autocomplete="off"
                                        oninput="acSearch(this,'subDistrict','ship')" onfocus="acSearch(this,'subDistrict','ship')" onclick="acSearch(this,'subDistrict','ship')" value="<?php echo e($formData['shipSubDistrict']); ?>">
                                    <div class="autocomplete-list" id="shipSubDistrict_list"></div>
                                </div>
                            </div>
                        </div>

                        <div class="grid-2">
                            <div class="form-group">
                                <label class="required">รหัสไปรษณีย์</label>
                                <input type="text" class="form-control" name="shipZipcode" id="shipZipcode"
                                    maxlength="5" placeholder="เช่น 10110"
                                    oninput="this.value = this.value.replace(/\D/g, '')" value="<?php echo e($formData['shipZipcode']); ?>">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 4: ข้อมูลใบอนุญาต -->
            <div class="tab">
                <h2 class="tab-title"><i class="fa-solid fa-id-card"></i> 4. ข้อมูลใบอนุญาตตัวแทน/นายหน้า</h2>

                <div class="form-group">
                    <label class="required">ประเภทใบอนุญาต</label>
                    <input type="hidden" name="agentType" id="actualAgentType" value="">
<?php
$agentChecked = (defined('DEFAULT_AGENT_TYPE') && DEFAULT_AGENT_TYPE === 'agent') ? 'checked' : '';
$brokerChecked = (defined('DEFAULT_AGENT_TYPE') && DEFAULT_AGENT_TYPE === 'broker') ? 'checked' : '';

$agentDisabled = (defined('DEFAULT_AGENT_TYPE') && DEFAULT_AGENT_TYPE === 'broker') ? 'disabled' : '';
$brokerDisabled = (defined('DEFAULT_AGENT_TYPE') && DEFAULT_AGENT_TYPE === 'agent') ? 'disabled' : '';

$agentStyle = (defined('DEFAULT_AGENT_TYPE') && DEFAULT_AGENT_TYPE === 'broker') ? 'style="opacity: 0.5; pointer-events: none;"' : '';
$brokerStyle = (defined('DEFAULT_AGENT_TYPE') && DEFAULT_AGENT_TYPE === 'agent') ? 'style="opacity: 0.5; pointer-events: none;"' : '';
?>
                    <div class="radio-group">
                        <label class="radio-item" <?php echo $agentStyle; ?>><input type="radio" name="agentTypeMain" value="ตัวแทนประกันวินาศภัย"
                                required onchange="toggleAgentAffiliation()" <?php echo $agentChecked; ?> <?php echo $agentDisabled; ?>> ตัวแทนประกันวินาศภัย</label>
                        <label class="radio-item" <?php echo $brokerStyle; ?>><input type="radio" name="agentTypeMain" value="นายหน้าประกันวินาศภัย" onchange="toggleAgentAffiliation()" <?php echo $brokerChecked; ?> <?php echo $brokerDisabled; ?>>
                            นายหน้าประกันวินาศภัย</label>
                    </div>
                    <div id="brokerTypeSection" style="display: none; margin-top: 10px; margin-left: 20px; border-left: 2px solid var(--primary-color); padding-left: 15px;">
                        <label style="font-size: 14px; margin-bottom: 8px; display: block;" class="required">ประเภทนายหน้า</label>
                        <div class="radio-group">
                            <label class="radio-item"><input type="radio" name="brokerType" value="นายหน้าบุคคล" onchange="toggleAgentAffiliation()">
                                นายหน้าบุคคล</label>
                            <label class="radio-item"><input type="radio" name="brokerType" value="นายหน้านิติบุคคล" onchange="toggleAgentAffiliation()">
                                นายหน้านิติบุคคล</label>
                        </div>
                    </div>
                </div>

                    <div class="grid-2">
                        <div class="form-group">
                            <label class="required">สาขา</label>
                            <p style="font-size: 13px; color: var(--text-muted); margin-top: -5px; margin-bottom: 8px;"><?php echo e(defined('DEFAULT_AGENT_BRANCH_HINT') ? DEFAULT_AGENT_BRANCH_HINT : ''); ?></p>
                            <div class="autocomplete-wrapper">
                                <input type="text" class="form-control" name="agentBranch" id="agentBranch" placeholder="พิมพ์เพื่อค้นหาสาขา" autocomplete="off"
                                    oninput="agentAcSearch('agentBranch')" onfocus="agentAcSearch('agentBranch')" onclick="agentAcSearch('agentBranch')" value="<?php echo e(!empty($formData['agentBranch']) ? $formData['agentBranch'] : (defined('DEFAULT_AGENT_BRANCH') ? DEFAULT_AGENT_BRANCH : '')); ?>" required>
                                <div class="autocomplete-list" id="agentBranch_list"></div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="required">ภาค</label>
                            <p style="font-size: 13px; color: var(--text-muted); margin-top: -5px; margin-bottom: 8px;"><?php echo e(defined('DEFAULT_AGENT_REGION_HINT') ? DEFAULT_AGENT_REGION_HINT : 'อัตโนมัติตามสาขาที่เลือก'); ?></p>
                            <div class="autocomplete-wrapper">
                                <input type="text" class="form-control" name="agentRegion" id="agentRegion" placeholder="ระบบจะเติมให้อัตโนมัติ" autocomplete="off" readonly style="background-color: #E9ECEF; cursor: not-allowed;" value="<?php echo e($formData['agentRegion']); ?>" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="required">รหัสที่มีสัญญากับ บมจ.วิริยะประกันภัย</label>
                        <p style="font-size: 13px; color: var(--text-muted); margin-top: -5px; margin-bottom: 8px;"><?php echo e(defined('DEFAULT_VIRIYAH_CODE_HINT') ? DEFAULT_VIRIYAH_CODE_HINT : 'ถ้าไม่ทราบ สอบถามสาขา หรือตัวแทน/นายหน้าที่ท่านสังกัด , ถ้าเป็นขอรับใบอนุญาต และยังไม่มีรหัส ให้กรอก 00000'); ?></p>
                        <input type="text" class="form-control" id="viriyahAgentCodeAgent" name="viriyahAgentCode" placeholder="เลข 5 หลักของตัวแทนขาย" maxlength="5" pattern="\d{5}" oninput="this.value = this.value.replace(/[^0-9]/g, '')" value="<?php echo e(!empty($formData['viriyahAgentCode']) ? $formData['viriyahAgentCode'] : (defined('DEFAULT_VIRIYAH_CODE') ? DEFAULT_VIRIYAH_CODE : '')); ?>" required>
                    </div>

                <div id="brokerAffiliationSection" style="display: none; background-color: #F8F9FA; padding: 20px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                    <h3 style="color: var(--primary-color); margin-bottom: 20px; font-size: 16px;"><i class="fa-solid fa-building"></i> ข้อมูลสังกัด</h3>
                    <div class="grid-2">
                        <div class="form-group">
                            <label>ข้อมูลสังกัดบริษัทโบรกเกอร์</label>
                            <input type="text" class="form-control" name="brokerAffiliation" id="brokerAffiliation" placeholder="ถ้ามีกรุณาระบุชื่อ" value="<?php echo e($formData['brokerAffiliation'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label>สาขาของบริษัทนายหน้าที่สังกัด (ถ้ามี)</label>
                            <input type="text" class="form-control" name="branchRecommender" id="branchRecommender" placeholder="ใส่คำตอบ" value="<?php echo e($formData['branchRecommender'] ?? ''); ?>">
                        </div>
                    </div>

                </div>

                <!-- <div class="form-group">
                    <label class="required">สถานะใบอนุญาตตาม e-Licensing</label>
                    <select class="form-control" name="licenseStatus" required>
                        <option value="">- เลือกสถานะใบอนุญาต -</option>
                        <option value="ไม่มีใบอนุญาต/ใบอนุญาตขาดต่อ">ไม่มีใบอนุญาต/ใบอนุญาตขาดต่อ</option>
                        <option value="ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 1">ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 1</option>
                        <option value="ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 2">ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 2</option>
                        <option value="ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 3">ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 3</option>
                        <option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย</option>
                        <option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 1">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 1</option>
                        <option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 2">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 2</option>
                        <option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 3">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 3</option>
                        <option value="ขอต่ออายุใบอนุญาตเป็น ตัวแทนหรือนายหน้า ประกันวินาศภัย ครั้งที่ 4 เป็นต้นไป">ขอต่ออายุใบอนุญาตเป็น ตัวแทนหรือนายหน้า ประกันวินาศภัย ครั้งที่ 4 เป็นต้นไป</option>
                    </select>
                </div> -->

                <div class="grid-3">
                    <div class="form-group">
                        <label>เลขที่ใบอนุญาต</label>
                        <input type="text" class="form-control" name="licenseNo"
                            placeholder="กรอกเลขที่ใบอนุญาต 10 หลัก" maxlength="10" minlength="10" pattern="\d{10}" oninput="this.value = this.value.replace(/[^0-9]/g, '')" value="<?php echo e($formData['licenseNo']); ?>">
                    </div>
                    <div class="form-group">
                        <label>วันที่ออกใบอนุญาต</label>
                        <input type="text" class="form-control datepicker" name="licenseIssue" placeholder="DD/MM/YYYY" value="<?php echo e($formData['licenseIssue']); ?>">
                    </div>
                    <div class="form-group">
                        <label>วันหมดอายุใบอนุญาต</label>
                        <input type="text" class="form-control datepicker" name="licenseExpire" placeholder="DD/MM/YYYY" value="<?php echo e($formData['licenseExpire']); ?>">
                    </div>
                </div>
            </div>

            <!-- Step 5:  -->
            <div class="tab">
                <h2 class="tab-title"><i class="fa-solid fa-chalkboard-user"></i> 5. หลักสูตรที่ประสงค์เข้าอบรม</h2>

                

                <div id="dynamicCourseSelection">
                    <div class="form-group" id="courseTypeGroup" style="display: none; margin-bottom: 30px;">
                        <label class="required" id="courseTypeLabel" style="font-size: 18px; color: var(--primary-color);">ระดับขอต่อ</label>
                        <div class="radio-group vertical" id="courseTypeContainer" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                            <!-- Course Types will be rendered here -->
                        </div>
                        <input type="hidden" name="courseType" id="courseTypeHidden">
                    </div>

                    <div class="form-group" id="previousCoursesSection" style="display: none; margin-top: 20px;">
                    <label>หากท่านถือใบอนุญาตเป็นตัวแทนหรือนายหน้าประกันวินาศภัยที่ต่ออายุครั้งที่ 4 เป็นต้นไป โปรดระบุวิชาที่ท่านเคยเข้าอบรมในรอบการสะสมชั่วโมงอบรมปัจจุบัน (5 ปี)<br>
                    <span style="color: var(--error-color); font-size: 14px;">* สำคัญ * : เพื่อท่านจะต้องไม่อบรมวิชาที่เคยเข้าอบรมซ้ำอีก ตามข้อกำหนดของ สำนักงาน คปภ.</span></label>
                    <div class="radio-group" style="padding: 15px; border: 1px solid var(--border-color); border-radius: 6px; background-color: #F8F9FA;">
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="การกำกับดูแลบริษัทประกันภัยตามระดับความเสี่ยง"> การกำกับดูแลบริษัทประกันภัยตามระดับความเสี่ยง</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="การจัดการสินไหมทดแทน Non-Motor"> การจัดการสินไหมทดแทน Non-Motor</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="การประกันภัยความเสี่ยงภัยทรัพย์สิน"> การประกันภัยความเสี่ยงภัยทรัพย์สิน</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="การวางแผนเพื่อวัยเกษียณ"> การวางแผนเพื่อวัยเกษียณ</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="การวางแผนภาษีสำหรับตัวแทนและนายหน้าประกันภัย"> การวางแผนภาษีสำหรับตัวแทนและนายหน้าประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="การประกันภัยต่อ"> การประกันภัยต่อ</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="จรรยาบรรณและศีลธรรมของตัวแทน/นายหน้าประกันภัย"> จรรยาบรรณและศีลธรรมของตัวแทน/นายหน้าประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="พ.ร.บ.จราจรทางบก พ.ศ.2522 (แก้ไขเพิ่มเติม2562) และการพิจารณาคดีแพ่ง/อาญาเมื่อเกิดอุบัติเหตุจราจร"> พ.ร.บ.จราจรทางบก พ.ศ.2522 (แก้ไขเพิ่มเติม2562) และการพิจารณาคดีแพ่ง/อาญาเมื่อเกิดอุบัติเหตุจราจร</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล"> พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="เสนอขายถูกหลักประกันภัยเติบโต"> เสนอขายถูกหลักประกันภัยเติบโต</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="กฏหมายว่าด้วยการป้องกันและปราบปรามการฟอกเงินและต่อต้านการสนับสนุนทางการเงินแก่การก่อการร้าย"> กฏหมายว่าด้วยการป้องกันและปราบปรามการฟอกเงินและต่อต้านการสนับสนุนทางการเงินแก่การก่อการร้าย</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="กรมธรรม์ประกันภัยรถยนต์ไฟฟ้ารวมการคุ้มครองผู้ประสบภัยจากรถ"> กรมธรรม์ประกันภัยรถยนต์ไฟฟ้ารวมการคุ้มครองผู้ประสบภัยจากรถ</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="พ.ร.บ.การทวงถามหนี้"> พ.ร.บ.การทวงถามหนี้</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="ความเสี่ยงต่อความรับผิดในฐานะตัวแทน/นายหน้าประกันภัย"> ความเสี่ยงต่อความรับผิดในฐานะตัวแทน/นายหน้าประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="การตลาดยุคใหม่"> การตลาดยุคใหม่</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="รู้จักประกันภัยสุขภาพ"> รู้จักประกันภัยสุขภาพ</label>
                        <label class="radio-item"><input type="checkbox" name="previousCourses[]" value="การพิจารณารับประกันภัยรถยนต์"> การพิจารณารับประกันภัยรถยนต์</label>
                    </div>
                </div>

                    <div class="form-group" id="trainingDateGroup" style="display: none; margin-bottom: 30px;">
                        <label class="required" id="trainingDateLabel" style="font-size: 18px; color: var(--primary-color);">เลือกรอบวันที่ต้องการเข้าอบรม</label>
                        <div class="radio-group vertical" id="trainingDateContainer" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                            <!-- Training Dates/Topics will be rendered here -->
                        </div>
                    </div>
                </div>

                <hr style="border: 1px solid var(--border-color); margin: 30px 0;">
                <div class="form-group" id="deductionPrivilegeGroup" style="display: <?php echo e((isset($formData['courseType']) && strpos($formData['courseType'], 'ขอต่อใบอนุญาตตัวแทน/นายหน้าประกันวินาศภัย 4 เป็นต้นไป') !== false) ? 'block' : 'none'); ?>;">
                    <label>สิทธิ์ลดหย่อนชั่วโมงอบรม</label>
                    <div class="radio-group">
                        <label class="radio-item"><input type="checkbox" name="deductionPrivilege[]" value="MasterDegree" id="masterDegreeCheckbox" onchange="toggleMasterDegreeRadios()" <?php echo e(in_array('MasterDegree', $formData['deductionPrivilege'] ?? []) ? 'checked' : ''); ?>> สำเร็จการศึกษาตั้งแต่ระดับปริญญาโทขึ้นไป จากสถาบันอุดมศึกษาหรือสถาบันการศึกษาในต่างประเทศที่สำนักงานคณะกรรมการข้าราชการพลเรือนรับรอง</label>
                        <div id="masterDegreeRadios" style="display: <?php echo e(in_array('MasterDegree', $formData['deductionPrivilege'] ?? []) ? 'block' : 'none'); ?>; margin-top: 15px; margin-left: 25px;">
                            <label class="required" style="font-size: 16px; margin-bottom: 5px; display: block; color: var(--text-color);">กรุณาระบุสถานะการยื่นเอกสาร</label>
                            <span style="font-size: 14px; color: #d9534f; display: block; margin-bottom: 10px;">* หากท่านเคยยื่นเอกสารและบันทึกในระบบของสำนักงาน คปภ. แล้วไม่ต้องยื่นซ้ำ</span>
                            <div class="radio-group vertical" style="display: flex; flex-direction: column; gap: 10px;">
                                <label class="radio-item"><input type="radio" name="masterDegreeStatus" value="เคยยื่นเอกสารลดหย่อนก่อนหน้านี้แล้ว" <?php echo e((isset($formData['masterDegreeStatus']) && $formData['masterDegreeStatus'] === 'เคยยื่นเอกสารลดหย่อนก่อนหน้านี้แล้ว') ? 'checked' : ''); ?>> เคยยื่นเอกสารลดหย่อนก่อนหน้านี้แล้ว</label>
                                <label class="radio-item"><input type="radio" name="masterDegreeStatus" value="ไม่เคยยื่นเอกสารลดหย่อนก่อนหน้านี้แล้ว" <?php echo e((isset($formData['masterDegreeStatus']) && $formData['masterDegreeStatus'] === 'ไม่เคยยื่นเอกสารลดหย่อนก่อนหน้านี้แล้ว') ? 'checked' : ''); ?>> ไม่เคยยื่นเอกสารลดหย่อนก่อนหน้านี้แล้ว</label>
                            </div>
                        </div>
                    </div>
                </div>

                

                <!-- <div class="form-group" style="margin-top: 20px;">
                    <label>หลักสูตรที่ท่านต้องการรับการอบรมเพิ่มเติม (โปรดระบุ)</label>
                    <input type="text" class="form-control" name="additionalCourseRequirement" id="additionalCourseRequirement" placeholder="ใส่คำตอบ">
                </div> -->
            </div>

            <!-- Step 6: รายละเอียดเพิ่มเติม -->
            <div class="tab">
                <h2 class="tab-title"><i class="fa-solid fa-list-check"></i> 6. รายละเอียดเพิ่มเติม</h2>

                <!-- <div class="form-group">
                    <label class="required">ระดับการศึกษาสูงสุด</label>
                    <select class="form-control" name="education" required>
                        <option value="">- เลือกระดับการศึกษา -</option>
                        <option value="ต่ำกว่าปริญญาตรี">ต่ำกว่าปริญญาตรี</option>
                        <option value="ปริญญาตรี">ปริญญาตรี</option>
                        <option value="ปริญญาโท">ปริญญาโท</option>
                        <option value="ปริญญาเอก">ปริญญาเอก</option>
                    </select>
                </div> -->


                <div class="form-group">
                    <label>ธุรกิจอื่นที่ท่านทำ</label>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: -5px; margin-bottom: 8px;">กรุณาระบุประเภทธุรกิจ</p>
                    <input type="text" class="form-control" name="occupation" placeholder="กรุณาระบุ" value="<?php echo e($formData['occupation']); ?>">
                </div>

                <div class="form-group">
                    <label>ประสบการณ์ในธุรกิจประกันภัย</label>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: -5px; margin-bottom: 8px;">จำนวนปี เช่น 3</p>
                    <input type="number" class="form-control" name="insuranceExperienceYears" id="insuranceExperienceYears" placeholder="ค่าต้องเป็นตัวเลข" min="0">
                </div>

                <div class="form-group">
                    <label>เขตพื้นที่การขาย</label>
                    <div class="radio-group" style="display: flex; flex-wrap: wrap; gap: 10px;">
                        <label class="radio-item"><input type="checkbox" name="salesTerritories[]" value="ภาคกลาง"> ภาคกลาง</label>
                        <label class="radio-item"><input type="checkbox" name="salesTerritories[]" value="ภาคเหนือ"> ภาคเหนือ</label>
                        <label class="radio-item"><input type="checkbox" name="salesTerritories[]" value="ภาคตะวันออกเฉียงเหนือ"> ภาคตะวันออกเฉียงเหนือ</label>
                        <label class="radio-item"><input type="checkbox" name="salesTerritories[]" value="ภาคตะวันออก"> ภาคตะวันออก</label>
                        <label class="radio-item"><input type="checkbox" name="salesTerritories[]" value="ภาคตะวันตก"> ภาคตะวันตก</label>
                        <label class="radio-item"><input type="checkbox" name="salesTerritories[]" value="ภาคใต้"> ภาคใต้</label>
                    </div>
                </div>

                <div class="form-group">
                    <label>ความเชี่ยวชาญประเภทประกันภัย</label>
                    <div class="radio-group vertical" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยรถยนต์"> ประกันภัยรถยนต์</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยความรับผิดของผู้ขนส่ง"> ประกันภัยความรับผิดของผู้ขนส่ง</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยอุบัติเหตุ"> ประกันภัยอุบัติเหตุ</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยสุขภาพ"> ประกันภัยสุขภาพ</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันเดินทางต่างประเทศ"> ประกันเดินทางต่างประเทศ</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยโจรกรรมรถจักรยานยนต์"> ประกันภัยโจรกรรมรถจักรยานยนต์</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยสำหรับบ้านและทรัพย์สิน"> ประกันภัยสำหรับบ้านและทรัพย์สิน</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยสำหรับธุรกิจและความรับผิด"> ประกันภัยสำหรับธุรกิจและความรับผิด</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยด้านการเงินและการค้ำประกัน"> ประกันภัยด้านการเงินและการค้ำประกัน</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยด้านวิศวกรรม"> ประกันภัยด้านวิศวกรรม</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยทางทะเลและขนส่ง"> ประกันภัยทางทะเลและขนส่ง</label>
                        <label class="radio-item"><input type="checkbox" name="insuranceSpecialty[]" value="ประกันภัยเบ็ดเตล็ด"> ประกันภัยเบ็ดเตล็ด</label>
                    </div>
                </div>

                <div class="form-group">
                    <label>บริษัทประกันภัยอื่นที่ท่านส่งงานในปัจจุบัน</label>
                    <div class="radio-group" style="max-height: 400px; overflow-y: auto; padding: 15px; border: 1px solid var(--border-color); border-radius: 6px; background-color: #F8F9FA;">
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. กรุงเทพประกันภัย"> บมจ. กรุงเทพประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. กรุงเทพประกันสุขภาพ"> บมจ. กรุงเทพประกันสุขภาพ</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. กรุงไทยพานิชประกันภัย"> บมจ. กรุงไทยพานิชประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บ. กลางคุ้มครองผู้ประสบภัยจากรถ"> บ. กลางคุ้มครองผู้ประสบภัยจากรถ</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. คุ้มภัยโตเกียวมารีนประกันภัย"> บมจ. คุ้มภัยโตเกียวมารีนประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. เจมาร์ทประกันภัย"> บมจ. เจมาร์ทประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ชับบ์สามัคคีประกันภัย"> บมจ. ชับบ์สามัคคีประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ซมโปะ ประกันภัย "> บมจ. ซมโปะ ประกันภัย </label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ซันเดย์ประกันภัย "> บมจ. ซันเดย์ประกันภัย </label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ทิพยประกันภัย"> บมจ. ทิพยประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ทูนประกันภัย"> บมจ. ทูนประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. เทเวศประกันภัย"> บมจ. เทเวศประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ไทยประกันสุขภาพ"> บมจ. ไทยประกันสุขภาพ</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ไทยพัฒนาประกันภัย"> บมจ. ไทยพัฒนาประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ไทยไพบูลย์ประกันภัย"> บมจ. ไทยไพบูลย์ประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ไทยรับประกันภัยต่อ"> บมจ. ไทยรับประกันภัยต่อ</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ไทยเศรษฐกิจประกันภัย"> บมจ. ไทยเศรษฐกิจประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ธนชาตประกันภัย"> บมจ. ธนชาตประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. นวกิจประกันภัย"> บมจ. นวกิจประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. นิวอินเดียแอสชัวรันซ์"> บมจ. นิวอินเดียแอสชัวรันซ์</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. บางกอกสหประกันภัย"> บมจ. บางกอกสหประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ประกันภัยไทยวิวัฒน์"> บมจ. ประกันภัยไทยวิวัฒน์</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. แปซิฟิค ครอส ประกันสุขภาพ"> บมจ. แปซิฟิค ครอส ประกันสุขภาพ</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ฟอลคอนประกันภัย"> บมจ. ฟอลคอนประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. มิตซุย สุมิโตโม อินชัวรันซ์"> บมจ. มิตซุย สุมิโตโม อินชัวรันซ์</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. มิตรแท้ประกันภัย"> บมจ. มิตรแท้ประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. เมืองไทยประกันภัย"> บมจ. เมืองไทยประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. รู้ใจประกันภัย"> บมจ. รู้ใจประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. สตาร์ อินเตอร์เนชั่นแนล อินชัวรันซ์"> บมจ. สตาร์ อินเตอร์เนชั่นแนล อินชัวรันซ์</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. สยามสไมล์ประกันภัย"> บมจ. สยามสไมล์ประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. สหนิรภัยประกันภัย"> บมจ. สหนิรภัยประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. สหมงคลประกันภัย"> บมจ. สหมงคลประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. อลิอันซ์ อยุธยา ประกันภัย"> บมจ. อลิอันซ์ อยุธยา ประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. อินชัวร์เวิร์ส"> บมจ. อินชัวร์เวิร์ส</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. เอ็มเอสไอจี ประกันภัย"> บมจ. เอ็มเอสไอจี ประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. เอไอจี ประกันภัย"> บมจ. เอไอจี ประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. แอกซ่าประกันภัย"> บมจ. แอกซ่าประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. แอลเอ็มจี ประกันภัย"> บมจ. แอลเอ็มจี ประกันภัย</label>
                        <label class="radio-item"><input type="checkbox" name="otherInsuranceCompanies[]" value="บมจ. ไอโออิ กรุงเทพ ประกันภัย"> บมจ. ไอโออิ กรุงเทพ ประกันภัย</label>
                    </div>
                </div>

            </div>

            <!-- Navigation Buttons -->
            <div class="btn-container">
                <button type="button" class="btn btn-prev" id="prevBtn" onclick="nextPrev(-1)"><i
                        class="fa-solid fa-arrow-left"></i> ย้อนกลับ</button>
                <button type="button" class="btn btn-next" id="nextBtn" onclick="nextPrev(1)">ถัดไป <i
                        class="fa-solid fa-arrow-right"></i></button>
            </div>

        </form>

    </div>

    <script>
        let currentTab = 0;
        let savedNationalId = ''; // จำ national_id หลัง Tab 2 save เสร็จ
        let savedId = '';

        function toggleTitleNameOther() {
            let selectBox = document.getElementsByName("titleName")[0];
            let otherContainer = document.getElementById("titleNameOtherContainer");
            let otherInput = document.getElementById("titleNameOther");
            let selectedText = selectBox.options.length > 0 && selectBox.selectedIndex >= 0 ? selectBox.options[selectBox.selectedIndex].text : "";
            if (selectedText === "อื่นๆ" || selectBox.value === "4" || selectBox.value === "อื่นๆ") {
                otherContainer.style.display = "block";
                otherInput.setAttribute("required", "required");
            } else {
                otherContainer.style.display = "none";
                otherInput.removeAttribute("required");
                otherInput.value = "";
                otherInput.classList.remove("invalid");
            }
        }
        function toggleTitleNameOtherPrev() {
            let selectBox = document.getElementById("titleNamePrev");
            let otherContainer = document.getElementById("titleNameOtherContainerPrev");
            let otherInput = document.getElementById("titleNameOtherPrev");
            let selectedText = selectBox.options.length > 0 && selectBox.selectedIndex >= 0 ? selectBox.options[selectBox.selectedIndex].text : "";
            if (selectedText === "อื่นๆ" || selectBox.value === "4" || selectBox.value === "อื่นๆ") {
                otherContainer.style.display = "block";
                otherInput.setAttribute("required", "required");
            } else {
                otherContainer.style.display = "none";
                otherInput.removeAttribute("required");
                otherInput.value = "";
                otherInput.classList.remove("invalid");
            }
        }

        document.addEventListener("DOMContentLoaded", function() {
            let checkedAgent = document.querySelector('input[name="agentTypeMain"]:checked');
            if (checkedAgent) toggleAgentAffiliation();
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('success')) {
                // We are on the success page tab
                let stepInd = document.getElementById('stepIndicator');
                if (stepInd) stepInd.style.display = 'none';
                let regForm = document.getElementById('regForm');
                if (regForm) regForm.style.display = 'none';
                let page = document.getElementById('successPage');
                if (page) page.style.display = 'block';
                
                let nid = urlParams.get('national_id');
                let ph = urlParams.get('phone');
                let uploadBtn = document.getElementById('uploadLinkBtn');
                if (uploadBtn && nid) {
                    uploadBtn.href = 'index-round2.php?national_id=' + encodeURIComponent(nid) + '&phone=' + encodeURIComponent(ph || '');
                }
                
                let checkInfoBtn = document.getElementById('checkInfoBtn');
                if (checkInfoBtn && nid) {
                    checkInfoBtn.href = 'https://iptc.xn--z3cbl2brb.com/form/enquiry.corse.php?citizen_id=' + encodeURIComponent(nid);
                }
                return;
            }
            
            showTab(currentTab);

            // Add listener to previous courses checkboxes
            let prevCourseCheckboxes = document.querySelectorAll('input[name="previousCourses[]"]');
            prevCourseCheckboxes.forEach(cb => {
                cb.addEventListener('change', updateDisabledTrainingDates);
            });
        });

        function updateDisabledTrainingDates() {
            let checkedPrevious = Array.from(document.querySelectorAll('input[name="previousCourses[]"]:checked')).map(cb => cb.value.trim());
            let trainingCheckboxes = document.querySelectorAll('input[name="trainingDate[]"], input[name="trainingDate"]');
            
            trainingCheckboxes.forEach(cb => {
                let shouldDisable = checkedPrevious.some(prev => cb.value.includes(prev));
                if (shouldDisable) {
                    cb.disabled = true;
                    cb.checked = false;
                    cb.parentElement.style.opacity = "0.5";
                    cb.parentElement.style.cursor = "not-allowed";
                } else {
                    cb.disabled = false;
                    cb.parentElement.style.opacity = "1";
                    cb.parentElement.style.cursor = "pointer";
                }
            });
        }

        function showTab(n) {
            let tabs = document.getElementsByClassName("tab");
            tabs[n].style.display = "block";

            // Buttons logic
            if (n == 0) {
                document.getElementById("prevBtn").style.display = "none";
            } else {
                document.getElementById("prevBtn").style.display = "flex";
            }

            if (n == (tabs.length - 1)) {
                document.getElementById("nextBtn").innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งข้อมูลการสมัคร';
                document.getElementById("nextBtn").className = "btn btn-submit";
            } else {
                document.getElementById("nextBtn").innerHTML = 'ถัดไป <i class="fa-solid fa-arrow-right"></i>';
                document.getElementById("nextBtn").className = "btn btn-next";
            }

            if (n === 0) {
                checkPDPA();
            } else {
                document.getElementById("nextBtn").disabled = false;
                document.getElementById("nextBtn").style.opacity = "1";
                document.getElementById("nextBtn").style.cursor = "pointer";
            }

            updateStepIndicator(n);
        }

        async function nextPrev(n) {
            let tabs = document.getElementsByClassName("tab");

            // Validate before moving forward
            if (n == 1 && !validateForm()) return false;

            // AJAX save hooks when moving forward
            if (n == 1) {
                if (currentTab === 1) {
                    // Tab 2 → Tab 3: INSERT personal info
                    let ok = await saveTab2();
                    if (!ok) return false;
                } else if (currentTab === 2) {
                    // Tab 3 → Tab 4: UPDATE address
                    let ok = await saveTab3();
                    if (!ok) return false;
                } else if (currentTab === 3) {
                    // Tab 4 → Tab 5: UPDATE license
                    let ok = await saveTab4();
                    if (!ok) return false;
                } else if (currentTab === 4) {
                    // Tab 5 → Tab 6: UPDATE training
                    let ok = await saveTab5();
                    if (!ok) return false;
                } else if (currentTab === 5) {
                    // Tab 6 → Submit: UPDATE details
                    let ok = await saveTab6();
                    if (!ok) return false;
                }
            }

            // Hide current tab
            tabs[currentTab].style.display = "none";

            // Increase or decrease current tab
            currentTab = currentTab + n;

            // If reached the end of the form
            if (currentTab >= tabs.length) {
                submitForm();
                return false;
            }

            showTab(currentTab);

            // Scroll back to top of the page on tab change
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // ===== AJAX Save Functions =====

        async function saveTab2() {
            showSaving(true);
            try {
                let data = new FormData();

                // Basic personal info fields
                const fields = [
                    'idCard','idCardExpiry','titleName','titleNameOther',
                    'firstNameTh','middleNameTh','lastNameTh',
                    'firstNameEn','middleNameEn','lastNameEn',
                    'birthDate','religion','gender','bloodGroup',
                    'phone','email','lineId','facebook','instagram',
                    'foodAllergy','chronicDisease',
                    'emergencyContactName','emergencyContactPhone'
                ];
                fields.forEach(name => {
                    let el = document.querySelector('[name="' + name + '"]');
                    if (el) data.append(name, el.value);
                });

                // Radio: hasChangedName
                let hasChanged = document.querySelector('[name="hasChangedName"]:checked');
                data.append('hasChangedName', hasChanged ? hasChanged.value : 'no');

                // Previous name fields
                const prevFields = [
                    'titleNamePrev','titleNameOtherPrev',
                    'firstNameThPrev','middleNameThPrev','lastNameThPrev',
                    'firstNameEnPrev','middleNameEnPrev','lastNameEnPrev'
                ];
                prevFields.forEach(name => {
                    let el = document.querySelector('[name="' + name + '"]');
                    if (el) data.append(name, el.value);
                });

                // PDPA consent
                let pdpa = document.querySelector('[name="pdpaConsent"]:checked');
                data.append('pdpaConsent', pdpa ? pdpa.value : 'รับทราบ');

                let res = await fetch('save_tab2.php', { method: 'POST', body: data });
                let json = await res.json();

                if (json.ok) {
                    savedNationalId = json.national_id;
                    savedId = json.id;
                    return true;
                } else {
                    showSaveError(json.error || 'บันทึกข้อมูลส่วนตัวไม่สำเร็จ');
                    return false;
                }
            } catch (e) {
                showSaveError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + e.message);
                return false;
            } finally {
                showSaving(false);
            }
        }

        async function saveTab3() {
            if (!savedNationalId) {
                showSaveError('ไม่พบรหัสประชาชน กรุณากลับไปกรอก Tab 2 ใหม่');
                return false;
            }
            showSaving(true);
            try {
                let data = new FormData();


                const fields = [
                    'houseNo','moo','village','soi','road',
                    'province','district','subDistrict','zipcode',
                    'shipHouseNo','shipMoo','shipVillage','shipSoi','shipRoad',
                    'shipProvince','shipDistrict','shipSubDistrict','shipZipcode'
                ];
                fields.forEach(name => {
                    let el = document.querySelector('[name="' + name + '"]');
                    if (el) data.append(name, el.value);
                });

                // shippingAddress radio
                let shipAddr = document.querySelector('[name="shippingAddress"]:checked');
                data.append('shippingAddress', shipAddr ? shipAddr.value : 'same');

                let res = await fetch('save_tab3.php', { method: 'POST', body: data });
                let json = await res.json();

                if (json.ok) {
                    return true;
                } else {
                    if (json.error && json.error.includes('Session timeout')) {
                        alert('หมดเวลาการทำรายการ (Session Timeout) กรุณาเริ่มทำรายการใหม่');
                        window.location.reload();
                        return false;
                    }
                    showSaveError(json.error || 'บันทึกที่อยู่ไม่สำเร็จ');
                    return false;
                }
            } catch (e) {
                showSaveError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + e.message);
                return false;
            } finally {
                showSaving(false);
            }
        }

        async function saveTab4() {
            if (!savedNationalId) {
                showSaveError('ไม่พบรหัสประชาชน กรุณากลับไปกรอก Tab 2 ใหม่');
                return false;
            }
            showSaving(true);
            try {
                let data = new FormData();


                let agentType = document.getElementById("actualAgentType");
                if (agentType && agentType.value) data.append('agentType', agentType.value);

                const fields = [
                    'agentRegion','agentBranch','brokerAffiliation',
                    'branchRecommender','licenseNo','licenseIssue','licenseExpire'
                ];
                fields.forEach(name => {
                    let el = document.querySelector('[name="' + name + '"]');
                    if (el) data.append(name, el.value);
                });

                let codeAgent = document.getElementById("viriyahAgentCodeAgent");
                if (codeAgent) data.append('viriyahAgentCodeAgent', codeAgent.value);



                let res = await fetch('save_tab4.php', { method: 'POST', body: data });
                let json = await res.json();

                if (json.ok) {
                    return true;
                } else {
                    if (json.error && json.error.includes('Session timeout')) {
                        alert('หมดเวลาการทำรายการ (Session Timeout) กรุณาเริ่มทำรายการใหม่');
                        window.location.reload();
                        return false;
                    }
                    showSaveError(json.error || 'บันทึกข้อมูลใบอนุญาตไม่สำเร็จ');
                    return false;
                }
            } catch (e) {
                showSaveError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + e.message);
                return false;
            } finally {
                showSaving(false);
            }
        }

        async function saveTab5() {
            if (!savedNationalId) {
                showSaveError('ไม่พบรหัสประชาชน กรุณากลับไปกรอก Tab 2 ใหม่');
                return false;
            }
            showSaving(true);
            try {
                let data = new FormData();


                let agentType = document.getElementById("actualAgentType");
                if (agentType && agentType.value) data.append('agentType', agentType.value);

                let courseType = document.getElementById("courseTypeHidden");
                if (courseType) data.append('courseType', courseType.value);

                let trainingDates = document.querySelectorAll('[name="trainingDate[]"]:checked');
                if (trainingDates.length > 0) {
                    trainingDates.forEach(td => data.append('trainingDate[]', td.value));
                } else {
                    let tdRadio = document.querySelector('[name="trainingDate"]:checked');
                    if (tdRadio) data.append('trainingDate', tdRadio.value);
                }

                let deductionPrivilege = document.querySelectorAll('[name="deductionPrivilege[]"]:checked');
                deductionPrivilege.forEach(dp => data.append('deductionPrivilege[]', dp.value));

                let masterStatus = document.querySelector('[name="masterDegreeStatus"]:checked');
                if (masterStatus) data.append('masterDegreeStatus', masterStatus.value);

                let prevCourses = document.querySelectorAll('[name="previousCourses[]"]:checked');
                prevCourses.forEach(pc => data.append('previousCourses[]', pc.value));

                let res = await fetch('save_tab5.php', { method: 'POST', body: data });
                let json = await res.json();

                if (json.ok) {
                    return true;
                } else {
                    if (json.error && json.error.includes('Session timeout')) {
                        alert('หมดเวลาการทำรายการ (Session Timeout) กรุณาเริ่มทำรายการใหม่');
                        window.location.reload();
                        return false;
                    }
                    showSaveError(json.error || 'บันทึกข้อมูลการอบรมไม่สำเร็จ');
                    return false;
                }
            } catch (e) {
                showSaveError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + e.message);
                return false;
            } finally {
                showSaving(false);
            }
        }

        async function saveTab6() {
            if (!savedNationalId) {
                showSaveError('ไม่พบรหัสประชาชน กรุณากลับไปกรอก Tab 2 ใหม่');
                return false;
            }
            showSaving(true);
            try {
                let data = new FormData();


                let occupation = document.querySelector('[name="occupation"]');
                if (occupation) data.append('occupation', occupation.value);

                let experience = document.querySelector('[name="insuranceExperienceYears"]');
                if (experience) data.append('insuranceExperienceYears', experience.value);

                let salesTerritories = document.querySelectorAll('[name="salesTerritories[]"]:checked');
                salesTerritories.forEach(st => data.append('salesTerritories[]', st.value));

                let otherInsuranceCompanies = document.querySelectorAll('[name="otherInsuranceCompanies[]"]:checked');
                otherInsuranceCompanies.forEach(oic => data.append('otherInsuranceCompanies[]', oic.value));

                let insuranceSpecialty = document.querySelectorAll('[name="insuranceSpecialty[]"]:checked');
                insuranceSpecialty.forEach(is => data.append('insuranceSpecialty[]', is.value));

                let res = await fetch('save_tab6.php', { method: 'POST', body: data });
                let json = await res.json();

                if (json.ok) {
                    return true;
                } else {
                    if (json.error && json.error.includes('Session timeout')) {
                        alert('หมดเวลาการทำรายการ (Session Timeout) กรุณาเริ่มทำรายการใหม่');
                        window.location.reload();
                        return false;
                    }
                    showSaveError(json.error || 'บันทึกข้อมูลรายละเอียดเพิ่มเติมไม่สำเร็จ');
                    return false;
                }
            } catch (e) {
                showSaveError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + e.message);
                return false;
            } finally {
                showSaving(false);
            }
        }

        function showSaving(show) {
            let btn = document.getElementById('nextBtn');
            if (!btn) return;
            if (show) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
                btn.style.opacity = '0.7';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                // Restore correct label
                let tabs = document.getElementsByClassName('tab');
                if (currentTab == tabs.length - 1) {
                    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งข้อมูลการสมัคร';
                    btn.className = 'btn btn-submit';
                } else {
                    btn.innerHTML = 'ถัดไป <i class="fa-solid fa-arrow-right"></i>';
                    btn.className = 'btn btn-next';
                }
            }
        }

        function showSaveError(msg) {
            let toast = document.getElementById('saveErrorToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'saveErrorToast';
                toast.style.cssText = [
                    'position:fixed', 'top:24px', 'right:24px',
                    'background:#C62828', 'color:#fff',
                    'padding:14px 20px', 'border-radius:10px',
                    'box-shadow:0 4px 20px rgba(0,0,0,0.25)',
                    'z-index:99999', 'font-family:Sarabun,sans-serif',
                    'font-size:15px', 'max-width:420px',
                    'display:flex', 'align-items:flex-start', 'gap:10px',
                    'animation:slideInToast 0.3s ease'
                ].join(';');
                document.body.appendChild(toast);
            }
            toast.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="margin-top:2px;flex-shrink:0"></i><span>' + msg + '</span>';
            toast.style.display = 'flex';
            clearTimeout(toast._hideTimer);
            toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, 6000);
        }

        function toggleMasterDegreeRadios() {
            let checkbox = document.getElementById("masterDegreeCheckbox");
            let radiosDiv = document.getElementById("masterDegreeRadios");
            if (!checkbox || !radiosDiv) return;

            let radios = radiosDiv.querySelectorAll('input[type="radio"]');

            if (checkbox.checked) {
                radiosDiv.style.display = "block";
                radios.forEach(radio => radio.setAttribute("required", "required"));
            } else {
                radiosDiv.style.display = "none";
                radios.forEach(radio => {
                    radio.removeAttribute("required");
                    radio.checked = false;
                    let container = radio.closest('.radio-group');
                    if (container) {
                        container.classList.remove('invalid');
                        removeErrorMsg(container);
                    }
                });
            }
        }

        function toggleTitleNameOther() {
            let selectBox = document.getElementsByName("titleName")[0];
            let otherContainer = document.getElementById("titleNameOtherContainer");
            let otherInput = document.getElementById("titleNameOther");

            let selectedText = selectBox.options.length > 0 && selectBox.selectedIndex >= 0 ? selectBox.options[selectBox.selectedIndex].text : "";
            if (selectedText === "อื่นๆ" || selectBox.value === "4" || selectBox.value === "อื่นๆ") {
                otherContainer.style.display = "block";
                otherInput.setAttribute("required", "required");
            } else {
                otherContainer.style.display = "none";
                otherInput.removeAttribute("required");
                otherInput.value = "";
                otherInput.classList.remove("invalid");
            }
        }
        function toggleTitleNameOtherPrev() {
            let selectBox = document.getElementById("titleNamePrev");
            let otherContainer = document.getElementById("titleNameOtherContainerPrev");
            let otherInput = document.getElementById("titleNameOtherPrev");

            let selectedText = selectBox.options.length > 0 && selectBox.selectedIndex >= 0 ? selectBox.options[selectBox.selectedIndex].text : "";
            if (selectedText === "อื่นๆ" || selectBox.value === "4" || selectBox.value === "อื่นๆ") {
                otherContainer.style.display = "block";
                otherInput.setAttribute("required", "required");
            } else {
                otherContainer.style.display = "none";
                otherInput.removeAttribute("required");
                otherInput.value = "";
                otherInput.classList.remove("invalid");
            }
        }

        function togglePreviousName() {
            let radios = document.getElementsByName("hasChangedName");
            let prevSection = document.getElementById("previousNameSection");
            let reqFields = ["titleNamePrev", "firstNameThPrev", "lastNameThPrev", "firstNameEnPrev", "lastNameEnPrev"];
            let showPrev = false;

            for (let i = 0; i < radios.length; i++) {
                if (radios[i].checked && radios[i].value === "yes") {
                    showPrev = true;
                    break;
                }
            }

            if (showPrev) {
                prevSection.style.display = "block";
                for (let id of reqFields) {
                    document.getElementById(id).setAttribute("required", "required");
                }
            } else {
                prevSection.style.display = "none";
                for (let id of reqFields) {
                    let el = document.getElementById(id);
                    el.removeAttribute("required");
                    el.value = "";
                    el.classList.remove("invalid");
                }
                // Clear middle name fields (no required, but must be cleared too)
                let midTh = document.getElementById("middleNameThPrev");
                let midEn = document.getElementById("middleNameEnPrev");
                if (midTh) { midTh.value = ""; midTh.classList.remove("invalid"); }
                if (midEn) { midEn.value = ""; midEn.classList.remove("invalid"); }
                let otherTitlePrevInput = document.getElementById("titleNameOtherPrev");
                otherTitlePrevInput.removeAttribute("required");
                otherTitlePrevInput.value = "";
                otherTitlePrevInput.classList.remove("invalid");
                document.getElementById("titleNameOtherContainerPrev").style.display = "none";
            }
        }

        function toggleAgentAffiliation() {
            let mainRadios = document.getElementsByName("agentTypeMain");
            let subRadios = document.getElementsByName("brokerType");
            let actualAgentTypeInput = document.getElementById("actualAgentType");
            let brokerTypeSection = document.getElementById("brokerTypeSection");
            let brokerSection = document.getElementById("brokerAffiliationSection");
            let brokerReqFields = [];
            let isAgent = false;
            let isBroker = false;
            let isCorporateBroker = false;
            let selectedType = "";

            for (let i = 0; i < mainRadios.length; i++) {
                if (mainRadios[i].checked) {
                    selectedType = mainRadios[i].value;
                    if (selectedType === "ตัวแทนประกันวินาศภัย") {
                        isAgent = true;
                    } else if (selectedType === "นายหน้าประกันวินาศภัย") {
                        isBroker = true;
                    }
                    break;
                }
            }

            if (isBroker) {
                brokerTypeSection.style.display = "block";
                for (let el of subRadios) el.setAttribute("required", "required");
                for (let i = 0; i < subRadios.length; i++) {
                    if (subRadios[i].checked) {
                        selectedType = subRadios[i].value;
                        if (selectedType === "นายหน้านิติบุคคล") {
                            isCorporateBroker = true;
                        }
                        break;
                    }
                }
            } else {
                brokerTypeSection.style.display = "none";
                for (let el of subRadios) {
                    el.removeAttribute("required");
                    el.checked = false;
                }
            }

            if (actualAgentTypeInput) {
                actualAgentTypeInput.value = selectedType;
            }




            if (isCorporateBroker) {
                brokerSection.style.display = "block";
            } else {
                brokerSection.style.display = "none";
                let brokerAffiliation = document.getElementById("brokerAffiliation");
                if (brokerAffiliation) {
                    brokerAffiliation.value = "";
                }
                let branchRecommender = document.getElementById("branchRecommender");
                if (branchRecommender) {
                    branchRecommender.value = "";
                }
            }

            updateCourseTypeOptions(selectedType);
            updateLicenseStatusOptions(selectedType);
        }

        function updateLicenseStatusOptions(selectedType) {
            let licenseSelect = document.getElementsByName("licenseStatus")[0];
            if (!licenseSelect) return;
            
            // If the user already selected something, try to keep it if it's still valid
            let currentValue = licenseSelect.value;
            
            licenseSelect.innerHTML = '<option value="">- เลือกสถานะใบอนุญาต -</option>';
            
            if (selectedType === "ตัวแทนประกันวินาศภัย") {
                licenseSelect.innerHTML += '<option value="ไม่มีใบอนุญาต/ใบอนุญาตขาดต่อ">ไม่มีใบอนุญาต/ใบอนุญาตขาดต่อ</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 1">ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 1</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 2">ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 2</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 3">ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 3</option>';
                licenseSelect.innerHTML += '<option value="ขอต่ออายุใบอนุญาตเป็น ตัวแทนหรือนายหน้า ประกันวินาศภัย ครั้งที่ 4 เป็นต้นไป">ขอต่ออายุใบอนุญาตเป็น ตัวแทนหรือนายหน้า ประกันวินาศภัย ครั้งที่ 4 เป็นต้นไป</option>';
            } else if (selectedType && selectedType.includes("นายหน้า")) {
                licenseSelect.innerHTML += '<option value="ไม่มีใบอนุญาต/ใบอนุญาตขาดต่อ">ไม่มีใบอนุญาต/ใบอนุญาตขาดต่อ</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 1">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 1</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 2">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 2</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 3">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 3</option>';
                licenseSelect.innerHTML += '<option value="ขอต่ออายุใบอนุญาตเป็น ตัวแทนหรือนายหน้า ประกันวินาศภัย ครั้งที่ 4 เป็นต้นไป">ขอต่ออายุใบอนุญาตเป็น ตัวแทนหรือนายหน้า ประกันวินาศภัย ครั้งที่ 4 เป็นต้นไป</option>';
            } else {
                licenseSelect.innerHTML += '<option value="ไม่มีใบอนุญาต/ใบอนุญาตขาดต่อ">ไม่มีใบอนุญาต/ใบอนุญาตขาดต่อ</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 1">ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 1</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 2">ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 2</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 3">ใบอนุญาตเป็น ตัวแทน ประกันวินาศภัย ครั้งที่ 3</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 1">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 1</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 2">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 2</option>';
                licenseSelect.innerHTML += '<option value="ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 3">ใบอนุญาตเป็น นายหน้า ประกันวินาศภัย ครั้งที่ 3</option>';
                licenseSelect.innerHTML += '<option value="ขอต่ออายุใบอนุญาตเป็น ตัวแทนหรือนายหน้า ประกันวินาศภัย ครั้งที่ 4 เป็นต้นไป">ขอต่ออายุใบอนุญาตเป็น ตัวแทนหรือนายหน้า ประกันวินาศภัย ครั้งที่ 4 เป็นต้นไป</option>';
            }
            
            // Restore selection if it still exists in the new options
            if (currentValue) {
                let optionExists = Array.from(licenseSelect.options).some(opt => opt.value === currentValue);
                if (optionExists) {
                    licenseSelect.value = currentValue;
                }
            }
        }

        const courseScheduleData = <?php echo $courseScheduleJson; ?>;
function updateCourseTypeOptions(selectedType) {
    let courseGroup = document.getElementById("courseTypeGroup");
    let dateGroup = document.getElementById("trainingDateGroup");
    let container = document.getElementById("courseTypeContainer");
    let label = document.getElementById("courseTypeLabel");
    let hiddenInput = document.getElementById("courseTypeHidden");

    // Reset
    container.innerHTML = "";
    hiddenInput.value = "";
    dateGroup.style.display = "none";
    let previousCoursesSection = document.getElementById("previousCoursesSection");
    if (previousCoursesSection) {
        previousCoursesSection.style.display = "none";
        let checkboxes = previousCoursesSection.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => { cb.checked = false; });
    }

    let deductionGroup = document.getElementById("deductionPrivilegeGroup");
    if (deductionGroup) {
        deductionGroup.style.display = "none";
        let checkboxes = deductionGroup.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => { cb.checked = false; });
        if (typeof toggleMasterDegreeRadios === 'function') toggleMasterDegreeRadios();
    }

    let baseType = (selectedType && selectedType.includes("นายหน้า")) ? "นายหน้าประกันวินาศภัย" : "ตัวแทนประกันวินาศภัย";

    if (!selectedType || !courseScheduleData[baseType]) {
        courseGroup.style.display = "none";
        return;
    }

    courseGroup.style.display = "block";
    label.textContent = "หลักสูตร";

    let courses = courseScheduleData[baseType];
    
    for (let courseId in courses) {
        let course = courses[courseId];
        let labelEl = document.createElement("label");
        labelEl.className = "radio-item custom-radio";
        
        let input = document.createElement("input");
        input.type = "radio";
        input.name = "courseTypeUI";
        input.value = courseId; // ID
        input.required = true;
        input.dataset.name = course.name;

        // Restore if matches
        <?php if (isset($formData['courseType'])): ?>
            if ("<?php echo $formData['courseType']; ?>" === courseId || "<?php echo $formData['courseType']; ?>" === course.name) {
                input.checked = true;
            }
        <?php endif; ?>
        
        input.addEventListener("change", function() {
            hiddenInput.value = this.value; // Store ID
            renderTrainingDates(selectedType, this.value);

            let deductionGroup = document.getElementById("deductionPrivilegeGroup");
            if (deductionGroup) {
                if (course.is_complex || course.name.includes("4 เป็นต้นไป")) {
                    deductionGroup.style.display = "block";
                } else {
                    deductionGroup.style.display = "none";
                    let checkboxes = deductionGroup.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(cb => { cb.checked = false; });
                    if (typeof toggleMasterDegreeRadios === 'function') toggleMasterDegreeRadios();
                }
            }

            let previousCoursesSection = document.getElementById("previousCoursesSection");
            if (previousCoursesSection) {
                if (course.is_complex || course.name.includes("4 เป็นต้นไป")) {
                    previousCoursesSection.style.display = "block";
                } else {
                    previousCoursesSection.style.display = "none";
                    let checkboxes = previousCoursesSection.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(cb => { cb.checked = false; });
                }
            }
        });

        labelEl.appendChild(input);
        labelEl.appendChild(document.createTextNode(" " + course.name));
        container.appendChild(labelEl);
    }
}



        function renderTrainingDates(agentType, courseId) {
    let dateGroup = document.getElementById("trainingDateGroup");
    let container = document.getElementById("trainingDateContainer");
    let label = document.getElementById("trainingDateLabel");
    
    container.innerHTML = "";
    
    let baseType = (agentType && agentType.includes("นายหน้า")) ? "นายหน้าประกันวินาศภัย" : "ตัวแทนประกันวินาศภัย";
    let course = courseScheduleData[baseType][courseId];

    if (!course || !course.dates || course.dates.length === 0) {
        dateGroup.style.display = "none";
        return;
    }

    dateGroup.style.display = "block";
    label.textContent = course.name; 
    
    let isMultiple = course.is_complex || course.name.includes("4 เป็นต้นไป");
    let inputType = isMultiple ? "checkbox" : "radio";
    
    course.dates.forEach((dateStr) => {
        let labelEl = document.createElement("label");
        labelEl.className = "radio-item " + (isMultiple ? "custom-checkbox" : "custom-radio");
        
        let input = document.createElement("input");
        input.type = inputType;
        input.name = isMultiple ? "trainingDate[]" : "trainingDate";
        input.value = dateStr;
        if (!isMultiple) input.required = true;

        <?php if (isset($formData['trainingDate'])): ?>
            let selectedDates = <?php echo json_encode(is_array($formData['trainingDate']) ? $formData['trainingDate'] : [$formData['trainingDate']]); ?>;
            if (selectedDates.includes(dateStr)) {
                input.checked = true;
            }
        <?php endif; ?>

        input.addEventListener('change', function() {
            container.classList.remove('invalid');
            removeErrorMsg(container);
            let items = container.querySelectorAll('.radio-item');
            items.forEach(el => {
                el.classList.remove('invalid');
                removeErrorMsg(el);
            });
            
        });
        
        labelEl.appendChild(input);
        labelEl.appendChild(document.createTextNode(" " + dateStr));
        container.appendChild(labelEl);
    });

    let oldNote = document.getElementById("trainingNoteMsg");
    if (oldNote) oldNote.remove();

    if (isMultiple) {
        let note = document.createElement("div");
        note.id = "trainingNoteMsg";
        note.style.marginTop = "5px";
        note.style.marginBottom = "10px";
        note.innerHTML = "<span style='color: var(--error-color); font-size: 14px;'>* เลือกได้มากกว่า 1 วิชา *</span><br><span style='color: var(--error-color); font-size: 14px; font-weight: normal;'>* หากเลือกวิชาที่เคยอบรม จะไม่นับรวมรอบปัจจุบัน (5 ปี) *</span>";
        label.insertAdjacentElement('afterend', note);
    }

    if (typeof updateDisabledTrainingDates === 'function') {
        updateDisabledTrainingDates();
    }
}

        function checkPDPA() {
            let pdpaRadios = document.getElementsByName('pdpaConsent');
            let nextBtn = document.getElementById("nextBtn");
            let isAccepted = false;
            if (!element) return;
            element.classList.add("invalid");
            
            // Find container to append the message
            let container = element;
            if (element.type === 'radio' || element.type === 'checkbox') {
                let group = element.closest('.radio-group');
                let item = element.closest('.radio-item');
                if (group) {
                    container = group;
                    let items = group.querySelectorAll('.radio-item');
                    items.forEach(el => el.classList.add('invalid'));
                } else if (item) {
                    container = item;
                    item.classList.add('invalid');
                }
            } else if (element.classList.contains('radio-group')) {
                container = element;
                let items = container.querySelectorAll('.radio-item');
                items.forEach(el => el.classList.add('invalid'));
            }
            
            // Check if error already exists
            let nextEl = container.nextElementSibling;
            if (nextEl && nextEl.classList && nextEl.classList.contains('error-msg')) {
                nextEl.innerText = msg;
                return;
            }
            
            let msgEl = document.createElement("div");
            msgEl.className = "error-msg";
            msgEl.style.color = "var(--error-color)";
            msgEl.style.fontSize = "13px";
            msgEl.style.marginTop = "4px";
            msgEl.innerText = msg;
            
            container.parentNode.insertBefore(msgEl, container.nextSibling);
        }

        function validateForm() {
            let valid = true;
            let firstInvalid = null;
            let tabs = document.getElementsByClassName("tab");
            let inputs = tabs[currentTab].querySelectorAll("input[required], select[required], textarea[required]");

            // Special check for PDPA radio buttons in Step 1
            if (currentTab === 0) {
                let pdpaRadios = document.getElementsByName('pdpaConsent');
                let isChecked = false;
                let isAccepted = false;
                for (let i = 0; i < pdpaRadios.length; i++) {
                    if (pdpaRadios[i].checked) {
                        isChecked = true;
                        if (pdpaRadios[i].value === 'accept') {
                            isAccepted = true;
                        }
                    }
                }

                if (!isChecked || !isAccepted) {
                    showFieldError(pdpaRadios[0], "กรุณายอมรับนโยบายความเป็นส่วนตัวเพื่อดำเนินการต่อ");
                    valid = false;
                    if (!firstInvalid) firstInvalid = pdpaRadios[0];
                }
            }

            // Custom check for idCardExpiry in Step 2 (Index 1)
            if (currentTab === 1) {
                let idCardExpiry = document.querySelector('input[name="idCardExpiry"]');
                if (idCardExpiry && idCardExpiry.value.trim() !== "") {
                    let parts = idCardExpiry.value.split('/');
                    if (parts.length === 3) {
                        let year = parseInt(parts[2]);
                        if (year > 2400) year -= 543;
                        let expDate = new Date(year, parts[1] - 1, parts[0]);
                        let today = new Date();
                        today.setHours(0,0,0,0);
                        if (expDate <= today) {
                            showFieldError(idCardExpiry, "วันหมดอายุบัตรประชาชน ต้องมากกว่าวันที่ปัจจุบันเท่านั้น");
                            valid = false;
                            if (!firstInvalid) firstInvalid = idCardExpiry;
                        }
                    }
                }
            }

            // Custom check for birthDate in Step 2 (Index 1)
            if (currentTab === 1) {
                let birthDateInput = document.querySelector('input[name="birthDate"]');
                if (birthDateInput && birthDateInput.value.trim() !== "") {
                    let parts = birthDateInput.value.split('/');
                    if (parts.length === 3) {
                        let year = parseInt(parts[2]);
                        if (year > 2400) year -= 543;
                        let bday = new Date(year, parts[1] - 1, parts[0]);
                        let today = new Date();
                        let age = today.getFullYear() - bday.getFullYear();
                        let m = today.getMonth() - bday.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) {
                            age--;
                        }
                        if (age < 20) {
                            showFieldError(birthDateInput, "วัน/เดือน/ปี เกิด ต้องมากกว่า 20 นับจากวันที่ปัจจุบันเท่านั้น");
                            valid = false;
                            if (!firstInvalid) firstInvalid = birthDateInput;
                        }
                    }
                }
            }

            // Custom check for licenseNo in Step 4 (Index 3)
            if (currentTab === 3) {
                let licenseNo = document.querySelector('input[name="licenseNo"]');
                if (licenseNo && licenseNo.value.trim() !== "") {
                    if (licenseNo.value.trim().length !== 10) {
                        showFieldError(licenseNo, "เลขที่ใบอนุญาตต้องมี 10 หลัก");
                        valid = false;
                        if (!firstInvalid) firstInvalid = licenseNo;
                    }
                }
                
                let licenseExpire = document.querySelector('input[name="licenseExpire"]');
                if (licenseExpire && licenseExpire.value.trim() !== "") {
                    let parts = licenseExpire.value.split('/');
                    if (parts.length === 3) {
                        let year = parseInt(parts[2]);
                        if (year > 2400) year -= 543;
                        let expDate = new Date(year, parts[1] - 1, parts[0]);
                        let today = new Date();
                        today.setHours(0,0,0,0);
                        if (expDate <= today) {
                            showFieldError(licenseExpire, "วันหมดอายุใบอนุญาต ต้องมากกว่าวันที่ปัจจุบันเท่านั้น");
                            valid = false;
                            if (!firstInvalid) firstInvalid = licenseExpire;
                        }
                    }
                }
            }

            // Custom check for training dates and license requirement in Step 5 (Index 4)
            if (currentTab === 4) {
                let courseTypeInput = document.getElementById('courseTypeHidden');
                if (courseTypeInput && courseTypeInput.value.includes('ขอต่อ')) {
                    let licenseNo = document.querySelector('input[name="licenseNo"]');
                    let licenseExpire = document.querySelector('input[name="licenseExpire"]');
                    let missing = false;
                    
                    if (!licenseNo || licenseNo.value.trim() === "") {
                        missing = true;
                        if (licenseNo) showFieldError(licenseNo, "กรุณาระบุเลขที่ใบอนุญาต (จำเป็นสำหรับหลักสูตรขอต่อ)");
                    }
                    if (!licenseExpire || licenseExpire.value.trim() === "") {
                        missing = true;
                        if (licenseExpire) showFieldError(licenseExpire, "กรุณาระบุวันหมดอายุใบอนุญาต (จำเป็นสำหรับหลักสูตรขอต่อ)");
                    }

                    if (missing) {
                        alert("หลักสูตรที่คุณเลือก จำเป็นต้องระบุ 'เลขที่ใบอนุญาต' และ 'วันหมดอายุใบอนุญาต'\n\nระบบจะพากลับไปที่หน้าที่ 4 เพื่อให้คุณกรอกข้อมูลให้ครบถ้วน");
                        
                        // Switch back to Tab 4 (Index 3)
                        tabs[currentTab].style.display = "none";
                        currentTab = 3;
                        showTab(currentTab);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        
                        valid = false;
                        return valid;
                    }
                }

                let dateGroup = document.getElementById("trainingDateGroup");
                if (dateGroup && dateGroup.style.display !== "none") {
                    let trainingCheckboxes = dateGroup.querySelectorAll('input[name="trainingDate[]"]');
                    if (trainingCheckboxes.length > 0) {
                        let checked = Array.from(trainingCheckboxes).some(cb => cb.checked);
                        if (!checked) {
                            let items = dateGroup.querySelectorAll('.radio-item');
                            items.forEach(item => item.classList.add('invalid'));
                            showFieldError(dateGroup, "กรุณาเลือกวันที่ต้องการอบรม");
                            valid = false;
                            if (!firstInvalid) firstInvalid = dateGroup;
                        }
                    }
                }
            }

            // Normal validation
            for (let i = 0; i < inputs.length; i++) {
                if (inputs[i].type === "tel") {
                    let telRaw = inputs[i].value.replace(/\D/g, '');
                    if (telRaw !== "" || inputs[i].required) {
                        if (telRaw.length !== 10 || telRaw.charAt(0) !== '0') {
                            showFieldError(inputs[i], "หมายเลขโทรศัพท์ต้องมี 10 หลักและขึ้นต้นด้วย 0 เท่านั้น");
                            valid = false;
                            if (!firstInvalid) firstInvalid = inputs[i];
                        } else {
                            inputs[i].classList.remove("invalid");
                        }
                    }
                } else if (inputs[i].type === "radio" || inputs[i].type === "checkbox") {
                    let group = document.getElementsByName(inputs[i].name);
                    let checked = false;
                    for (let j = 0; j < group.length; j++) {
                        if (group[j].checked) {
                            checked = true;
                            break;
                        }
                    }
                    if (!checked) {
                        showFieldError(inputs[i], "กรุณาระบุข้อมูลนี้");
                        valid = false;
                        if (!firstInvalid) firstInvalid = inputs[i];
                    } else {
                        let container = inputs[i].closest('.radio-group') || inputs[i].closest('.radio-item');
                        if (container) container.classList.remove("invalid");
                    }
                } else if (inputs[i].value.trim() === "") {
                    showFieldError(inputs[i], "กรุณากรอกข้อมูลนี้");
                    valid = false;
                    if (!firstInvalid) firstInvalid = inputs[i];
                } else {
                    inputs[i].classList.remove("invalid");
                }
            }

            if (!valid && firstInvalid) {
                // Focus and scroll to the first invalid element
                let focusTarget = firstInvalid;
                if (firstInvalid.id === 'trainingDateGroup' || firstInvalid.classList.contains('radio-group')) {
                    // It's a div, maybe focus the first input inside it
                    let firstInput = firstInvalid.querySelector('input');
                    if (firstInput) focusTarget = firstInput;
                }
                
                if (typeof focusTarget.focus === 'function') {
                    focusTarget.focus({preventScroll: true});
                }
                focusTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Mark step as finished
            if (valid) {
                document.getElementsByClassName("step-dot")[currentTab].className += " finish";
            }
            return valid;
        }

        function removeErrorMsg(el) {
            let container = el;
            if (el.type === 'radio' || el.type === 'checkbox') {
                let group = el.closest('.radio-group');
                let item = el.closest('.radio-item');
                if (group) container = group;
                else if (item) container = item;
            } else if (el.classList && el.classList.contains('radio-group')) {
                container = el;
            }
            if (container) {
                let nextEl = container.nextElementSibling;
                if (nextEl && nextEl.classList && nextEl.classList.contains('error-msg')) {
                    nextEl.remove();
                } else {
                    let formGroup = el.closest('.form-group');
                    if (formGroup) {
                        let err = formGroup.querySelector('.error-msg');
                        if (err) err.remove();
                    }
                }
            }
        }

        // === Auto-clear invalid (red border) when user fills data ===
        function attachClearInvalid() {
            var els = document.querySelectorAll('input, select, textarea');
            for (var i = 0; i < els.length; i++) {
                els[i].removeEventListener('input', clearInvalidHandler);
                els[i].removeEventListener('change', clearInvalidHandler);
                els[i].addEventListener('input', clearInvalidHandler);
                els[i].addEventListener('change', clearInvalidHandler);
            }
        }
        function clearInvalidHandler(e) {
            var el = e.target || e.srcElement || this;
            if (el && el.className && el.className.indexOf('invalid') !== -1) {
                el.className = el.className.replace(/\binvalid\b/g, '').trim();
            }
            if (el) removeErrorMsg(el);
            // For radio/checkbox, also clear the parent container if needed
            if (el && (el.type === 'radio' || el.type === 'checkbox')) {
                let container = el.closest('.radio-group') || el.closest('.radio-item');
                if (container && container.classList.contains('invalid')) {
                    container.classList.remove('invalid');
                }
                let group = el.closest('.radio-group');
                if (group) {
                    let items = group.querySelectorAll('.radio-item');
                    items.forEach(item => item.classList.remove('invalid'));
                } else if (container) {
                    container.classList.remove('invalid');
                }
                removeErrorMsg(el);
            }
        }
        // Attach on page load
        attachClearInvalid();
        // Re-attach after any click (covers post-validation scenarios)
        document.addEventListener('click', function() {
            setTimeout(attachClearInvalid, 100);
        });



        function updateStepIndicator(n) {
            let dots = document.getElementsByClassName("step-dot");
            for (let i = 0; i < dots.length; i++) {
                dots[i].className = dots[i].className.replace(" active", "");
            }
            dots[n].className += " active";
        }

        function formatDateText(input) {
            let v = input.value.replace(/\D/g, '');
            if (v.length > 8) v = v.substring(0, 8);
            let out = '';
            if (v.length > 0) out += v.substring(0, 2);
            if (v.length > 2) out += '/' + v.substring(2, 4);
            if (v.length > 4) out += '/' + v.substring(4, 8);
            input.value = out;
        }

        function formatIdCard(input) {
            let value = input.value.replace(/\D/g, '');
            let formatted = '';

            if (value.length > 0) formatted += value.substring(0, 1);
            if (value.length > 1) formatted += '-' + value.substring(1, 5);
            if (value.length > 5) formatted += '-' + value.substring(5, 10);
            if (value.length > 10) formatted += '-' + value.substring(10, 12);
            if (value.length > 12) formatted += '-' + value.substring(12, 13);

            input.value = formatted;
        }

        function formatPhone(input) {
            let value = input.value.replace(/\D/g, '');
            let formatted = '';

            if (value.length > 0) formatted += value.substring(0, 3);
            if (value.length > 3) formatted += '-' + value.substring(3, 6);
            if (value.length > 6) formatted += '-' + value.substring(6, 10);

            input.value = formatted;
        }

        function toggleShippingAddress() {
            const radios = document.getElementsByName('shippingAddress');
            const section = document.getElementById('shippingAddressSection');
            const shipFields = ['shipHouseNo', 'shipSubDistrict', 'shipDistrict', 'shipProvince', 'shipZipcode'];
            let showShipping = false;

            for (let i = 0; i < radios.length; i++) {
                if (radios[i].checked && radios[i].value === 'different') {
                    showShipping = true;
                    break;
                }
            }

            if (showShipping) {
                section.style.display = 'block';
                section.classList.add('reveal');
                for (let id of shipFields) {
                    document.getElementById(id).setAttribute('required', 'required');
                }
            } else {
                section.style.display = 'none';
                section.classList.remove('reveal');
                for (let id of shipFields) {
                    let el = document.getElementById(id);
                    el.removeAttribute('required');
                    el.value = '';
                    el.classList.remove('invalid');
                    removeErrorMsg(el);
                }
                // Also clear non-required shipping fields
                ['shipMoo', 'shipVillage', 'shipSoi', 'shipRoad'].forEach(id => {
                    document.getElementById(id).value = '';
                });
            }
        }

        function submitForm() {
            // Validation already done in nextPrev() before calling this function.
            // Show confirmation modal.
            showConfirmModal();
        }

        function getFieldValue(name) {
            let el = document.querySelector('[name="' + name + '"]');
            return el ? el.value.trim() : '';
        }

        function getCheckedRadio(name) {
            let el = document.querySelector('[name="' + name + '"]:checked');
            return el ? el.value : '-';
        }

        function showConfirmModal() {
            // Collect key info
            let title = getFieldValue('titleName');
            let titleOther = getFieldValue('titleNameOther');
            let displayTitle = (title === 'อื่นๆ' && titleOther) ? titleOther : title;
            let firstName = getFieldValue('firstNameTh');
            let lastName  = getFieldValue('lastNameTh');
            let idCard    = getFieldValue('idCard');
            let phone     = getFieldValue('phone');
            let email     = getFieldValue('email');
            let agentType = getFieldValue('agentType') || '-';
            let courseType = getFieldValue('courseType');

            // Training date(s)
            let trainingDates = [];
            document.querySelectorAll('[name="trainingDate"]:checked, [name="trainingDate[]"]').forEach(el => {
                if (el.checked) trainingDates.push(el.value);
            });
            let singleDate = document.querySelector('[name="trainingDate"]:checked');
            if (singleDate && !trainingDates.includes(singleDate.value)) trainingDates.push(singleDate.value);
            let trainingDateText = trainingDates.length > 0 ? trainingDates.join('<br>') : '-';

            let row = (label, value) => `
                <div class="confirm-row">
                    <span class="confirm-label">${label}</span>
                    <span class="confirm-value">${value || '-'}</span>
                </div>`;

            document.getElementById('confirmSummary').innerHTML =
                row('คำนำหน้า + ชื่อ-นามสกุล', `${displayTitle} ${firstName} ${lastName}`) +
                row('เลขบัตรประชาชน', idCard) +
                row('หมายเลขโทรศัพท์', phone) +
                row('อีเมล', email) +
                row('ประเภทใบอนุญาต', agentType) +
                row('หลักสูตร', courseType || '-')

            document.getElementById('confirmModal').classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function cancelConfirm() {
            document.getElementById('confirmModal').classList.remove('show');
            document.body.style.overflow = '';
            // Go back to last tab
            let tabs = document.getElementsByClassName('tab');
            currentTab = tabs.length - 1;
            tabs[currentTab].style.display = 'block';
            showTab(currentTab);
        }

        async function confirmSubmit() {
            if (!savedNationalId) {
                alert('ไม่พบรหัสประชาชน');
                return;
            }

            // Show loading on the confirm button
            let btn = document.querySelector('.modal-footer .btn-submit');
            let origHtml = '';
            if (btn) {
                origHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่งข้อมูล...';
                btn.disabled = true;
            }

            try {
                let data = new FormData();


                let res = await fetch('save_final.php', { method: 'POST', body: data });
                let json = await res.json();

                if (!json.ok) {
                    if (json.error && json.error.includes('Session timeout')) {
                        alert('หมดเวลาการทำรายการ (Session Timeout) กรุณาเริ่มทำรายการใหม่');
                        window.location.reload();
                        return;
                    }
                    alert('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + (json.error || 'Unknown error'));
                    if (btn) {
                        btn.innerHTML = origHtml;
                        btn.disabled = false;
                    }
                    return;
                }
            } catch (e) {
                alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + e.message);
                if (btn) {
                    btn.innerHTML = origHtml;
                    btn.disabled = false;
                }
                return;
            }

            // Hide modal
            document.getElementById('confirmModal').classList.remove('show');
            document.body.style.overflow = '';

            // Restore button state
            if (btn) {
                btn.innerHTML = origHtml;
                btn.disabled = false;
            }

            // Restore the tab view so the user can click back or edit again
            let tabs = document.getElementsByClassName('tab');
            currentTab = tabs.length - 1;
            tabs[currentTab].style.display = 'block';
            showTab(currentTab);

            // Append query parameters to upload link
            let phoneInput = document.querySelector('[name="phone"]');
            let phoneVal = phoneInput ? phoneInput.value.trim() : '';
            
            // Open success page in a new tab
            let successUrl = window.location.pathname + '?success=1&national_id=' + encodeURIComponent(savedNationalId) + '&phone=' + encodeURIComponent(phoneVal);
            window.open(successUrl, '_blank');
        }

        // ===== Relational Address Data System =====
        let rawProvinces = [];
        let rawDistricts = [];
        let rawSubDistricts = [];

        async function loadAddressData() {
            try {
                const fetchWithFallback = async (filename) => {
                    let res = await fetch(filename);
                    let text = await res.text();
                    // ถ้า Server ส่งกลับมาเป็น HTML (เช่นโดน WordPress หรือ Router ดักหน้า 404)
                    if (text.trim().startsWith('<')) {
                        // ลองดึงจาก Root path ดู
                        res = await fetch('/' + filename);
                        text = await res.text();
                        if (text.trim().startsWith('<')) {
                            throw new Error('ไม่พบไฟล์ JSON (Server ส่งกลับมาเป็น HTML)');
                        }
                    }
                    return JSON.parse(text);
                };

                const provData = await fetchWithFallback('api_locations.php?type=provinces');
                const distData = await fetchWithFallback('api_locations.php?type=districts');
                const subData = await fetchWithFallback('api_locations.php?type=sub_districts');

                rawProvinces = provData.provinces || [];
                rawDistricts = distData.districts || [];
                rawSubDistricts = subData.sub_districts || [];
            } catch (err) {
                console.error("Error loading address data:", err);
                alert("พบปัญหาในการโหลดข้อมูลที่อยู่\n\nสาเหตุ: ไม่พบไฟล์ JSON ข้อมูลจังหวัดบนเซิร์ฟเวอร์\nหากคุณนำไฟล์ index.php ไปวางในโฟลเดอร์ใหม่ (เช่น /new/) กรุณา Copy ไฟล์ provinces.json, districts.json และ sub_districts.json ตามไปวางในโฟลเดอร์เดียวกันด้วยครับ");
            }
        }
        
        // Load data on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadAddressData);
        } else {
            loadAddressData();
        }

        // ===== Address Autocomplete System =====
        function getFieldId(field, prefix) {
            if (!prefix) return field; // province, district, subDistrict
            // ship prefix: shipProvince, shipDistrict, shipSubDistrict
            return prefix + field.charAt(0).toUpperCase() + field.slice(1);
        }

        function acSearch(input, type, prefix) {
            var listId = getFieldId(type, prefix) + '_list';
            var listEl = document.getElementById(listId);
            var query = input.value.trim().toLowerCase();
            var items = [];

            if (type === 'province') {
                items = rawProvinces.map(p => ({
                    id: p.PROVINCE_ID,
                    text: p.PROVINCE_THAI
                }));
            } else if (type === 'district') {
                var provName = document.getElementById(getFieldId('province', prefix)).value;
                var provObj = rawProvinces.find(p => p.PROVINCE_THAI === provName);
                if (provObj) {
                    items = rawDistricts
                        .filter(d => d.PROVINCE_ID === provObj.PROVINCE_ID)
                        .map(d => ({
                            id: d.DISTRICT_ID,
                            text: d.DISTRICT_THAI
                        }));
                }
            } else if (type === 'subDistrict') {
                var distName = document.getElementById(getFieldId('district', prefix)).value;
                var distObj = rawDistricts.find(d => d.DISTRICT_THAI === distName);
                if (distObj) {
                    items = rawSubDistricts
                        .filter(s => s.DISTRICT_ID === distObj.DISTRICT_ID)
                        .map(s => ({
                            id: s.SUB_DISTRICT_ID,
                            text: s.SUB_DISTRICT_THAI,
                            postcode: s.POSTAL_CODE
                        }));
                }
            }

            if (query) {
                items = items.filter(i => i.text.toLowerCase().indexOf(query) !== -1);
            }

            listEl.innerHTML = '';
            if (items.length === 0) { listEl.classList.remove('show'); return; }

            // Province: show all 77, District/SubDistrict: limit to 50 when searching
            var displayItems = (type === 'province')
                ? items
                : (query ? items.slice(0, 50) : items);

            displayItems.forEach(function(itemObj) {
                var val = itemObj.text;
                var div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.setAttribute('data-val', val);
                if (itemObj.postcode) div.setAttribute('data-postcode', itemObj.postcode);
                
                if (query) {
                    var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                    div.innerHTML = val.replace(regex, '<mark style="background:rgba(228,160,37,0.25);padding:0;border-radius:2px;">$1</mark>');
                } else {
                    div.textContent = val;
                }
                div.onmousedown = function(e) { 
                    e.preventDefault(); 
                    acSelect(val, type, prefix, itemObj.postcode); 
                };
                listEl.appendChild(div);
            });
            listEl.classList.add('show');
        }

        function acSelect(value, type, prefix, postcode) {
            var input = document.getElementById(getFieldId(type, prefix));
            input.value = value;
            document.getElementById(getFieldId(type, prefix) + '_list').classList.remove('show');
            input.classList.remove('invalid');
            removeErrorMsg(input);

            // Cascade: clear child fields and set zip code if applicable
            var zipField = prefix ? 'shipZipcode' : 'zipcode';
            
            if (type === 'province') {
                var distInput = document.getElementById(getFieldId('district', prefix));
                var subInput = document.getElementById(getFieldId('subDistrict', prefix));
                distInput.value = ''; subInput.value = '';
                document.getElementById(zipField).value = '';
            } else if (type === 'district') {
                document.getElementById(getFieldId('subDistrict', prefix)).value = '';
                document.getElementById(zipField).value = '';
            } else if (type === 'subDistrict') {
                var zipInput = document.getElementById(zipField);
                if (postcode) {
                    zipInput.value = postcode;
                }
                zipInput.classList.remove('invalid');
                removeErrorMsg(zipInput);
            }
        }

        // Keyboard navigation for Address autocomplete
        ['province', 'district', 'subDistrict', 'shipProvince', 'shipDistrict', 'shipSubDistrict'].forEach(function(fieldId) {
            var input = document.getElementById(fieldId);
            if (!input) return;
            var activeIdx = -1;

            input.addEventListener('keydown', function(e) {
                var listEl = document.getElementById(fieldId + '_list');
                var items = listEl.querySelectorAll('.autocomplete-item');
                if (!items.length) return;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    activeIdx = Math.min(activeIdx + 1, items.length - 1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    activeIdx = Math.max(activeIdx - 1, 0);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    var selectedIdx = activeIdx >= 0 ? activeIdx : 0;
                    if (items[selectedIdx]) {
                        var isShip = fieldId.startsWith('ship');
                        var type = fieldId;
                        if (isShip) {
                            if (fieldId === 'shipProvince') type = 'province';
                            if (fieldId === 'shipDistrict') type = 'district';
                            if (fieldId === 'shipSubDistrict') type = 'subDistrict';
                        }
                        var prefix = isShip ? 'ship' : '';
                        var val = items[selectedIdx].getAttribute('data-val');
                        var postcode = items[selectedIdx].getAttribute('data-postcode');
                        acSelect(val, type, prefix, postcode);
                    }
                    activeIdx = -1;
                    return;
                } else if (e.key === 'Escape') {
                    listEl.classList.remove('show');
                    activeIdx = -1;
                    return;
                } else {
                    activeIdx = -1;
                    return;
                }

                items.forEach(function(i) { i.classList.remove('active'); });
                if (items[activeIdx]) {
                    items[activeIdx].classList.add('active');
                    items[activeIdx].scrollIntoView({ block: 'nearest' });
                }
            });

            input.addEventListener('blur', function() {
                setTimeout(function() {
                    var listEl = document.getElementById(fieldId + '_list');
                    if (listEl) listEl.classList.remove('show');
                    activeIdx = -1;
                }, 150);
            });
        });

        // Close all autocomplete lists when clicking outside
        document.addEventListener('click', function(e) {
            if (e.target.closest('.autocomplete-wrapper')) return;
            var lists = document.querySelectorAll('.autocomplete-list');
            lists.forEach(function(l) { l.classList.remove('show'); });
        });

        // ===== Autocomplete: สังกัดภาค & สาขา =====
        var agentRegionMap = {
            'ภาค 1 (ภาคเหนือ)': ['เชียงราย','เชียงใหม่','นครสวรรค์','พิษณุโลก'],
            'ภาค 2 (ภาคตะวันออกเฉียงเหนือ)': ['ขอนแก่น','นครราชสีมา','อุดรธานี','อุบลราชธานี'],
            'ภาค 3 (ภาคตะวันออก)': ['จันทบุรี','ฉะเชิงเทรา','พัทยา','ระยอง'],
            'ภาค 4 (ภาคกลางและภาคตะวันตก)': ['นครปฐม','พระนครศรีอยุธยา','สมุทรสาคร','สระบุรี'],
            'ภาค 5 (ภาคใต้)': ['กระบี่','นครศรีธรรมราช','ภูเก็ต','สุราษฎร์ธานี','หาดใหญ่'],
            'ภาค 6 (ภาคกรุงเทพฯ)': ['กรุงเกษม','ดอนเมือง','บางนา','บางพลัด','ปู่เจ้าสมิงพราย','พระราม 2','ปากเกร็ด-345','รัชดาภิเษก','ลุมพินี','วงศ์สว่าง','วิภาวดี','สุขสวัสดิ์','สุขาภิบาล 3','กิจกรรพิเศษ1','กิจกรรพิเศษ2']
        };

        var allBranches = [];
        var branchToRegion = {};
        for (var region in agentRegionMap) {
            agentRegionMap[region].forEach(function(branch) {
                allBranches.push(branch);
                branchToRegion[branch] = region;
            });
        }

        var agentAcData = {
            agentBranch: allBranches
        };

        function agentAcSearch(fieldId) {
            if (fieldId !== 'agentBranch') return;
            var input = document.getElementById(fieldId);
            var listEl = document.getElementById(fieldId + '_list');
            var query = input.value.trim().toLowerCase();
            var options = agentAcData[fieldId] || [];
            var filtered = query
                ? options.filter(function(o) { return o.toLowerCase().indexOf(query) !== -1; })
                : options;

            listEl.innerHTML = '';
            if (filtered.length === 0) { listEl.classList.remove('show'); return; }

            filtered.forEach(function(val) {
                var div = document.createElement('div');
                div.className = 'autocomplete-item';
                if (query) {
                    var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                    div.innerHTML = val.replace(regex, '<mark style="background:rgba(228,160,37,0.25);padding:0;border-radius:2px;">$1</mark>');
                } else {
                    div.textContent = val;
                }
                div.onmousedown = function(e) {
                    e.preventDefault();
                    input.value = val;
                    listEl.classList.remove('show');
                    input.classList.remove('invalid');
                    removeErrorMsg(input);
                    
                    var regionInput = document.getElementById('agentRegion');
                    if (regionInput && branchToRegion[val]) {
                        regionInput.value = branchToRegion[val];
                        regionInput.classList.remove('invalid');
                        removeErrorMsg(regionInput);
                    }
                };
                listEl.appendChild(div);
            });
            listEl.classList.add('show');
        }

        // Keyboard navigation for agent autocomplete
        ['agentBranch'].forEach(function(fieldId) {
            var input = document.getElementById(fieldId);
            if (!input) return;
            var activeIdx = -1;

            input.addEventListener('keydown', function(e) {
                var listEl = document.getElementById(fieldId + '_list');
                var items = listEl.querySelectorAll('.autocomplete-item');
                if (!items.length) return;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    activeIdx = Math.min(activeIdx + 1, items.length - 1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    activeIdx = Math.max(activeIdx - 1, 0);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    var selectedIdx = activeIdx >= 0 ? activeIdx : 0;
                    if (items[selectedIdx]) {
                        var val = items[selectedIdx].textContent;
                        input.value = val;
                        listEl.classList.remove('show');
                        input.classList.remove('invalid');
                        removeErrorMsg(input);
                        
                        var regionInput = document.getElementById('agentRegion');
                        if (regionInput && branchToRegion[val]) {
                            regionInput.value = branchToRegion[val];
                            regionInput.classList.remove('invalid');
                            removeErrorMsg(regionInput);
                        }
                    }
                    activeIdx = -1;
                    return;
                } else if (e.key === 'Escape') {
                    listEl.classList.remove('show');
                    activeIdx = -1;
                    return;
                } else {
                    activeIdx = -1;
                    return;
                }

                items.forEach(function(i) { i.classList.remove('active'); });
                if (items[activeIdx]) {
                    items[activeIdx].classList.add('active');
                    items[activeIdx].scrollIntoView({ block: 'nearest' });
                }
            });

            input.addEventListener('blur', function() {
                setTimeout(function() {
                    document.getElementById(fieldId + '_list').classList.remove('show');
                    activeIdx = -1;
                }, 150);
            });
            
            input.addEventListener('input', function(e) {
                var val = input.value.trim();
                var regionInput = document.getElementById('agentRegion');
                if (regionInput) {
                    if (branchToRegion[val]) {
                        regionInput.value = branchToRegion[val];
                        regionInput.classList.remove('invalid');
                        removeErrorMsg(regionInput);
                    } else {
                        regionInput.value = '';
                    }
                }
            });
        });

        // ===== Blur Event Validations =====
        document.addEventListener('DOMContentLoaded', function() {
            // Auto-fill Region on load if Branch is pre-filled
            var initialBranch = document.getElementById('agentBranch');
            if (initialBranch && initialBranch.value) {
                var regionInput = document.getElementById('agentRegion');
                if (regionInput && branchToRegion[initialBranch.value.trim()]) {
                    regionInput.value = branchToRegion[initialBranch.value.trim()];
                }
            }

            // ID Card validation
            let idCardInput = document.querySelector('input[name="idCard"]');
            if (idCardInput) {
                idCardInput.addEventListener('blur', function() {
                    let id = this.value.replace(/\D/g, '');
                    if (id.length > 0 && id.length !== 13) {
                        showFieldError(this, "เลขบัตรประชาชนต้องมี 13 หลัก");
                        return;
                    }
                    if (id.length === 13) {
                        let sum = 0;
                        for (let i = 0; i < 12; i++) {
                            sum += parseInt(id.charAt(i)) * (13 - i);
                        }
                        if ((11 - (sum % 11)) % 10 !== parseInt(id.charAt(12))) {
                            showFieldError(this, "เลขบัตรประชาชนไม่ถูกต้องตามรูปแบบราชการ");
                        }
                    }
                });
            }

            // Phone validation
            let phoneInputs = document.querySelectorAll('input[type="tel"]');
            phoneInputs.forEach(function(input) {
                input.addEventListener('blur', function() {
                    let telRaw = this.value.replace(/\D/g, '');
                    if (telRaw.length > 0) {
                        if (telRaw.length !== 10 || telRaw.charAt(0) !== '0') {
                            showFieldError(this, "หมายเลขโทรศัพท์ต้องมี 10 หลักและขึ้นต้นด้วย 0 เท่านั้น");
                        }
                    }
                });
            });

            // ID Card Expiry validation
            let idCardExpiryInput = document.querySelector('input[name="idCardExpiry"]');
            if (idCardExpiryInput) {
                let validateIdCardExpiry = function() {
                    if (this.value.trim() !== "") {
                        let parts = this.value.split('/');
                        if (parts.length === 3) {
                            let year = parseInt(parts[2]);
                            if (year > 2400) year -= 543;
                            let expDate = new Date(year, parts[1] - 1, parts[0]);
                            let today = new Date();
                            today.setHours(0,0,0,0);
                            if (expDate <= today) {
                                showFieldError(this, "วันหมดอายุบัตรประชาชน ต้องมากกว่าวันที่ปัจจุบันเท่านั้น");
                            }
                        }
                    }
                };
                idCardExpiryInput.addEventListener('blur', validateIdCardExpiry);
                idCardExpiryInput.addEventListener('change', validateIdCardExpiry);
            }

            // Birth Date validation
            let birthDateInput = document.querySelector('input[name="birthDate"]');
            if (birthDateInput) {
                let validateBirthDate = function() {
                    if (this.value.trim() !== "") {
                        let parts = this.value.split('/');
                        if (parts.length === 3) {
                            let year = parseInt(parts[2]);
                            if (year > 2400) year -= 543;
                            let bday = new Date(year, parts[1] - 1, parts[0]);
                            let today = new Date();
                            let age = today.getFullYear() - bday.getFullYear();
                            let m = today.getMonth() - bday.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) {
                                age--;
                            }
                            if (age < 20) {
                                showFieldError(this, "วัน/เดือน/ปี เกิด ต้องมากกว่า 20 นับจากวันที่ปัจจุบันเท่านั้น");
                            }
                        }
                    }
                };
                birthDateInput.addEventListener('blur', validateBirthDate);
                birthDateInput.addEventListener('change', validateBirthDate);
            }

            // License No validation
            let licenseNoInput = document.querySelector('input[name="licenseNo"]');
            if (licenseNoInput) {
                licenseNoInput.addEventListener('blur', function() {
                    if (this.value.trim() !== "") {
                        if (this.value.trim().length !== 10) {
                            showFieldError(this, "เลขที่ใบอนุญาตต้องมี 10 หลัก");
                        }
                    }
                });
            }

            // License Expire validation
            let licenseExpireInput = document.querySelector('input[name="licenseExpire"]');
            if (licenseExpireInput) {
                let validateLicenseExpire = function() {
                    if (this.value.trim() !== "") {
                        let parts = this.value.split('/');
                        if (parts.length === 3) {
                            let year = parseInt(parts[2]);
                            if (year > 2400) year -= 543;
                            let expDate = new Date(year, parts[1] - 1, parts[0]);
                            let today = new Date();
                            today.setHours(0,0,0,0);
                            if (expDate <= today) {
                                showFieldError(this, "วันหมดอายุใบอนุญาต ต้องมากกว่าวันที่ปัจจุบันเท่านั้น");
                            }
                        }
                    }
                };
                licenseExpireInput.addEventListener('blur', validateLicenseExpire);
                licenseExpireInput.addEventListener('change', validateLicenseExpire);
            }
        });
    </script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/th.js"></script>
    <script>
        function initDatePicker() {
            function forceBE(instance) {
                setTimeout(function() {
                    if (instance.currentYearElement) {
                        let y = instance.currentYear;
                        if (y < 2400) {
                            y += 543;
                        }
                        instance.currentYearElement.value = y;
                    }
                }, 0);
            }

            let baseConfig = {
                dateFormat: "d/m/Y",
                locale: "th",
                allowInput: true,
                disableMobile: true,
                onReady: function(selectedDates, dateStr, instance) { forceBE(instance); },
                onOpen: function(selectedDates, dateStr, instance) { forceBE(instance); },
                onValueUpdate: function(selectedDates, dateStr, instance) { forceBE(instance); },
                onYearChange: function(selectedDates, dateStr, instance) { forceBE(instance); },
                onMonthChange: function(selectedDates, dateStr, instance) { forceBE(instance); },
                formatDate: function(date, format, locale) {
                    let d = date.getDate().toString().padStart(2, '0');
                    let m = (date.getMonth() + 1).toString().padStart(2, '0');
                    let y = date.getFullYear();
                    if (y < 2400) {
                        y += 543;
                    }
                    return d + '/' + m + '/' + y;
                },
                parseDate: function(datestr, format) {
                    let parts = datestr.split('/');
                    if (parts.length === 3) {
                        let d = parseInt(parts[0], 10);
                        let m = parseInt(parts[1], 10) - 1;
                        let y = parseInt(parts[2], 10);
                        if (y > 2400) {
                            y -= 543;
                        }
                        return new Date(y, m, d);
                    }
                    return false;
                }
            };

            document.querySelectorAll(".datepicker").forEach(function(el) {
                let config = Object.assign({}, baseConfig);
                if (el.name === "birthDate") {
                    config.onOpen = function(selectedDates, dateStr, instance) {
                        if (selectedDates.length === 0) {
                            let d = new Date();
                            d.setFullYear(d.getFullYear() - 20);
                            instance.jumpToDate(d);
                        }
                        forceBE(instance);
                    };
                }
                flatpickr(el, config);
            });
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initDatePicker);
        } else {
            initDatePicker();
        }
    </script>
    <!-- Confirmation Modal -->
    <div id="confirmModal" class="confirm-overlay">
        <div class="confirm-card">
            <div class="confirm-header">
                <h2>กรุณาตรวจสอบข้อมูลด้านล่างให้ถูกต้องก่อนยืนยัน</h2>
            </div>
            <div class="confirm-body">
                <div id="confirmSummary"></div>
            </div>
            <div class="confirm-footer-wrapper">
                <div class="confirm-warning">
                    <i class="fa-solid fa-triangle-exclamation"></i> ข้อมูลยังไม่ถูกส่ง! กรุณากดปุ่ม "ยืนยันส่งข้อมูล" ด้านล่าง
                </div>
                <div class="confirm-footer">
                    <button type="button" class="btn-confirm-cancel" onclick="cancelConfirm()">
                        <i class="fa-solid fa-arrow-left"></i> ย้อนกลับแก้ไข
                    </button>
                    <button type="button" class="btn-confirm-submit pulse-button" onclick="confirmSubmit()">
                        <i class="fa-solid fa-paper-plane"></i> ยืนยันส่งข้อมูล
                    </button>
                </div>
            </div>
        </div>
    </div>

    <style>
        /* ===== Confirmation Modal ===== */
        .confirm-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 20, 50, 0.65);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 9999;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeInOverlay 0.25s ease;
        }
        .confirm-overlay.show {
            display: flex;
        }
        @keyframes fadeInOverlay {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        .confirm-card {
            background: #ffffff;
            border-radius: 18px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
            max-width: 560px;
            width: 100%;
            overflow: hidden;
            animation: slideUpCard 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUpCard {
            from { opacity: 0; transform: translateY(40px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .confirm-header {
            background: linear-gradient(135deg, var(--primary-color) 0%, #003B6F 100%);
            color: #fff;
            padding: 32px 30px 24px;
            text-align: center;
            border-bottom: 4px solid var(--secondary-color);
        }
        .confirm-icon {
            font-size: 48px;
            margin-bottom: 12px;
            color: var(--secondary-color);
            animation: popIn 0.4s 0.1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes popIn {
            from { transform: scale(0); opacity: 0; }
            to   { transform: scale(1); opacity: 1; }
        }
        .confirm-header h2 {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 6px;
        }
        .confirm-header p {
            font-size: 14px;
            opacity: 0.85;
            font-weight: 300;
        }
        .confirm-body {
            padding: 24px 28px;
            max-height: 50vh;
            overflow-y: auto;
        }
        .confirm-row {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 10px 0;
            border-bottom: 1px solid #F0F0F0;
            font-family: 'Sarabun', sans-serif;
            font-size: 15px;
        }
        .confirm-row:last-child { border-bottom: none; }
        .confirm-label {
            flex: 0 0 170px;
            color: var(--text-muted);
            font-weight: 500;
            font-size: 14px;
            padding-top: 2px;
        }
        .confirm-value {
            flex: 1;
            color: var(--text-main);
            font-weight: 600;
            word-break: break-word;
            line-height: 1.6;
        }
        .confirm-footer-wrapper {
            background: #FAFBFC;
            border-top: 1px solid #EEEEEE;
        }
        .confirm-warning {
            text-align: center;
            padding: 16px 20px 0;
            color: var(--error-color);
            font-size: 16px;
            font-weight: 600;
            animation: flashWarning 2s infinite;
        }
        @keyframes flashWarning {
            0%, 100% { color: var(--error-color); }
            50% { color: #ff9800; }
        }
        .pulse-button {
            animation: pulseSubmit 2s infinite;
        }
        @keyframes pulseSubmit {
            0% { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.6); }
            70% { box-shadow: 0 0 0 12px rgba(26, 115, 232, 0); }
            100% { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0); }
        }
        .confirm-footer {
            display: flex;
            gap: 12px;
            padding: 16px 28px 24px;
        }
        .btn-confirm-cancel {
            flex: 1;
            padding: 13px 20px;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            background: #fff;
            color: var(--text-main);
            font-family: 'Sarabun', sans-serif;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        .btn-confirm-cancel:hover {
            background: #F0F4F8;
            border-color: #BBBBBB;
        }
        .btn-confirm-submit {
            flex: 1.5;
            padding: 13px 20px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(135deg, var(--primary-color) 0%, #1A73E8 100%);
            color: #fff;
            font-family: 'Sarabun', sans-serif;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 14px rgba(0, 90, 156, 0.35);
            transition: all 0.2s ease;
        }
        .btn-confirm-submit:hover {
            background: linear-gradient(135deg, #1A73E8 0%, var(--primary-color) 100%);
            box-shadow: 0 6px 20px rgba(26, 115, 232, 0.45);
            transform: translateY(-1px);
        }
        .btn-confirm-submit:active {
            transform: translateY(0);
        }
        @media (max-width: 600px) {
            .confirm-label { flex: 0 0 130px; font-size: 13px; }
            .confirm-body  { padding: 18px 18px; }
            .confirm-footer { flex-direction: column; padding: 16px 18px; }
            .btn-confirm-submit, .btn-confirm-cancel { flex: unset; }
        }
    </style>

</body>

</html>

