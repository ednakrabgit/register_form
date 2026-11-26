import { Link } from 'react-router-dom';

export default function MasterDataDashboard() {
  const masterDataLinks = [
    { type: 'titles', title: 'จัดการคำนำหน้าชื่อ', icon: 'fa-list', color: 'text-primary' },
    { type: 'religion', title: 'จัดการศาสนา', icon: 'fa-praying-hands', color: 'text-primary' },
    { type: 'gender', title: 'จัดการเพศ', icon: 'fa-venus-mars', color: 'text-primary' },
    { type: 'blood', title: 'จัดการกรุ๊ปเลือด', icon: 'fa-droplet', color: 'text-primary' },
    { type: 'provinces', title: 'จัดการจังหวัด', icon: 'fa-map-location-dot', color: 'text-info', custom: true },
    { type: 'districts', title: 'จัดการอำเภอ', icon: 'fa-map', color: 'text-info', custom: true },
    { type: 'subdistricts', title: 'จัดการตำบล', icon: 'fa-location-crosshairs', color: 'text-info', custom: true },
    { type: 'territory', title: 'จัดการเขตพื้นที่ขาย', icon: 'fa-map-pin', color: 'text-info' },
    { type: 'agent-regions', title: 'จัดการภูมิภาคตัวแทน', icon: 'fa-earth-asia', color: 'text-primary', custom: true },
    { type: 'agent-branches', title: 'จัดการสาขาตัวแทน', icon: 'fa-code-branch', color: 'text-primary', custom: true },
    { type: 'expertise', title: 'จัดการความเชี่ยวชาญ', icon: 'fa-star', color: 'text-success' },
    { type: 'company', title: 'จัดการบริษัทประกันภัย', icon: 'fa-building', color: 'text-success' }
  ];

  const renewDataLinks = [
    { type: 'pillars', title: 'Pillars', icon: 'fa-layer-group', color: 'text-warning' },
    { type: 'renewdates', title: 'วันที่เปิดอบรม', icon: 'fa-calendar-alt', color: 'text-warning', custom: true },
    { type: 'renewbasic', title: 'หลักสูตรพื้นฐาน', icon: 'fa-book', color: 'text-warning', custom: true },
    { type: 'renewcourse', title: 'ชื่อวิชา (Subjects)', icon: 'fa-book-open', color: 'text-warning' },
    { type: 'renewmappings', title: 'จับคู่วิชาต่ออายุ', icon: 'fa-link', color: 'text-warning', custom: true },
    { path: '/admin/training-import', title: 'นำเข้าผลการอบรม (Stamp)', icon: 'fa-file-import', color: 'text-blue-600', isDirectPath: true }
  ];

  const oicDataLinks = [
    { type: 'oic-field-mapping', title: 'OIC Field Mapping', icon: 'fa-code-branch', color: 'text-danger', custom: true },
    { type: 'oic-value-mapping', title: 'OIC Value Mapping', icon: 'fa-exchange-alt', color: 'text-danger', custom: true }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 border-b-2 border-primary pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-2">จัดการข้อมูล (Master Data)</h2>
          <p className="text-gray-500 text-sm">เลือกระบบจัดการฐานข้อมูลที่คุณต้องการ</p>
        </div>
        <Link to="/admin" className="px-4 py-2 border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors">
          <i className="fas fa-arrow-left mr-2"></i> กลับหน้าหลัก
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
        {masterDataLinks.map((link) => (
          <div key={link.type} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center text-center transition-shadow hover:shadow-md h-full">
            <i className={`fas ${link.icon} text-5xl ${link.color} mb-4`}></i>
            <h4 className="text-lg font-bold text-gray-800 mb-2">{link.title}</h4>
            <p className="text-gray-500 text-xs mb-6 flex-1">เพิ่ม ลบ หรือแก้ไขข้อมูลในระบบ</p>
            <Link to={`/admin/master-data/${link.type}`} className={`px-6 py-2 border rounded transition-colors text-sm w-full ${link.custom ? 'border-info text-info hover:bg-info hover:text-white' : 'border-primary text-primary hover:bg-primary hover:text-white'}`}>
              จัดการข้อมูล
            </Link>
          </div>
        ))}
      </div>

      <div className="mb-6 border-b-2 border-warning pb-2">
        <h3 className="text-2xl font-bold text-warning">จัดการวิชาต่ออายุ (Renew Other & Past Training)</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {renewDataLinks.map((link, idx) => (
          <div key={link.type || link.path || idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center text-center transition-shadow hover:shadow-md h-full">
            <i className={`fas ${link.icon} text-5xl ${link.color} mb-4`}></i>
            <h4 className="text-lg font-bold text-gray-800 mb-2">{link.title}</h4>
            <p className="text-gray-500 text-xs mb-6 flex-1">{link.isDirectPath ? 'นำเข้าผลและ Stamp การอบรม' : 'เพิ่ม ลบ หรือแก้ไขข้อมูลในระบบ'}</p>
            <Link to={link.path || `/admin/master-data/${link.type}`} className={`px-6 py-2 border rounded transition-colors text-sm w-full ${link.isDirectPath ? 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white' : 'border-warning text-warning hover:bg-warning hover:text-white'}`}>
              {link.isDirectPath ? 'เข้าสู่ระบบนำเข้า' : 'จัดการข้อมูล'}
            </Link>
          </div>
        ))}
      </div>

      <div className="mb-6 border-b-2 border-danger pb-2">
        <h3 className="text-2xl font-bold text-danger">ตั้งค่าระบบ OIC (OIC Settings)</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
        {oicDataLinks.map((link) => (
          <div key={link.type} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center text-center transition-shadow hover:shadow-md h-full">
            <i className={`fas ${link.icon} text-5xl ${link.color} mb-4`}></i>
            <h4 className="text-lg font-bold text-gray-800 mb-2">{link.title}</h4>
            <p className="text-gray-500 text-xs mb-6 flex-1">ตั้งค่ารูปแบบข้อมูลที่รับจากระบบ OIC</p>
            <Link to={`/admin/master-data/${link.type}`} className={`px-6 py-2 border rounded transition-colors text-sm w-full border-danger text-danger hover:bg-danger hover:text-white`}>
              จัดการตั้งค่า
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
