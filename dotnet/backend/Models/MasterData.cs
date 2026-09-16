using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    // Generic abstraction for master data tables that just have an ID and a Name/Display text.
    // This supports the user's request to "design for 3-4 future hardcoded tables to be moved to DB".
    public abstract class BaseMasterData
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        
        [Column("name")]
        public string Name { get; set; } = null!;

        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "active"; // active, inactive

        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }
        
        [Column("display_order")]
        public int DisplayOrder { get; set; } = 0;
    }

    [Table("mst_provinces")]
    public class MstProvince
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        [Column("province_id")]
        public int ProvinceId { get; set; }
        
        [Column("province_thai")]
        public string ProvinceThai { get; set; } = null!;
        
        [Column("province_english")]
        public string? ProvinceEng { get; set; }

        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }
    }

    [Table("mst_districts")]
    public class MstDistrict
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        [Column("district_id")]
        public int DistrictId { get; set; }
        
        [Column("district_thai")]
        public string DistrictThai { get; set; } = null!;
        
        [Column("district_english")]
        public string? DistrictEng { get; set; }
        
        [Column("province_id")]
        public int ProvinceId { get; set; }

        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }
    }

    [Table("mst_sub_districts")]
    public class MstSubDistrict
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        [Column("sub_district_id")]
        public int SubDistrictId { get; set; }
        
        [Column("sub_district_thai")]
        public string SubDistrictThai { get; set; } = null!;
        
        [Column("sub_district_english")]
        public string? SubDistrictEng { get; set; }
        
        [Column("district_id")]
        public int DistrictId { get; set; }
        
        [Column("postal_code")]
        public string? Zipcode { get; set; }

        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }
    }

    [Table("mst_blood")]
    public class MstBlood : BaseMasterData
    {
    }

    [Table("mst_gender")]
    public class MstGender : BaseMasterData
    {
    }

    [Table("mst_religion")]
    public class MstReligion : BaseMasterData
    {
    }

    [Table("mst_titles")]
    public class MstTitle : BaseMasterData
    {
    }

    [Table("mst_territories")]
    public class MstTerritory : BaseMasterData
    {
    }

    [Table("mst_expertises")]
    public class MstExpertise : BaseMasterData
    {
    }

    [Table("mst_companies")]
    public class MstCompany : BaseMasterData
    {
    }

    [Table("mst_renew_course")]
    public class MstRenewCourse : BaseMasterData
    {
        [Column("default_pillar_id")]
        public int? DefaultPillarId { get; set; }
    }

    [Table("mst_course_curriculum")]
    public class MstCourseCurriculum
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("course_type")]
        [MaxLength(20)]
        public string CourseType { get; set; } = null!; // "basic" or "renew"

        [Column("course_id")]
        public int CourseId { get; set; } // FK to mst_renew_basic.id or mst_renew_course.id

        [Column("agent_type")]
        [MaxLength(20)]
        public string? AgentType { get; set; } // "agent", "broker", "both"

        [Column("training_course_code")]
        [MaxLength(100)]
        public string? TrainingCourseCode { get; set; } // Col R in training Excel (e.g. A4P1_04, B0N0O00)

        [Column("announcement_code")]
        [MaxLength(100)]
        public string? AnnouncementCode { get; set; } // e.g. NLGA-2564

        [Column("curriculum_code")]
        [MaxLength(100)]
        public string? CurriculumCode { get; set; } // e.g. นว0649991, ตนว4642037

        [Column("course_short_name")]
        [MaxLength(100)]
        public string? CourseShortName { get; set; } // e.g. นว0, ตว0, ตนว4

        [Column("display_order")]
        public int DisplayOrder { get; set; } = 0;

        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }

        public ICollection<MstCourseSubDetail> SubDetails { get; set; } = new List<MstCourseSubDetail>();
    }

    [Table("mst_course_sub_detail")]
    public class MstCourseSubDetail
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("curriculum_id")]
        public int CurriculumId { get; set; }

        [ForeignKey("CurriculumId")]
        [System.Text.Json.Serialization.JsonIgnore]
        public MstCourseCurriculum? Curriculum { get; set; }

        [Column("oic_course_code")]
        [MaxLength(100)]
        public string? OicCourseCode { get; set; } // e.g. นว064ก, ตนว4164203720

        [Column("sub_course_name")]
        [MaxLength(500)]
        public string? SubCourseName { get; set; }

        [Column("hours", TypeName = "decimal(5,2)")]
        public decimal? Hours { get; set; }

        [Column("display_order")]
        public int DisplayOrder { get; set; } = 0;

        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }
    }

    [Table("mst_renew_dates")]
    public class MstRenewDate
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("course_date_display")]
        public string CourseDateDisplay { get; set; } = null!;

        [Column("course_date")]
        public DateTime CourseDate { get; set; }
        
        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "active";
        
        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }

        [Column("display_order")]
        public int DisplayOrder { get; set; } = 0;
    }

    [Table("mst_agent_regions")]
    public class MstAgentRegion
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        [Column("name")]
        public string Name { get; set; } = null!;

        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }
    }

    [Table("mst_agent_branches")]
    public class MstAgentBranch
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        [Column("name")]
        public string Name { get; set; } = null!;
        
        [Column("region_id")]
        public int RegionId { get; set; }

        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }
    }

    [Table("mst_renew_basic")]
    public class MstRenewBasic
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("course_name")]
        public string CourseName { get; set; } = null!;

        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }

        [Column("date_id")]
        public int? DateId { get; set; }

        [Column("agent_type")]
        public string? AgentType { get; set; }
    }

    [Table("mst_renew_pillars")]
    public class MstRenewPillar : BaseMasterData
    {
    }

    [Table("mst_renew_other")]
    public class MstRenewOther
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("pillar_id")]
        public int PillarId { get; set; }

        [Column("date_id")]
        public int DateId { get; set; }

        [Column("subject_id")]
        public int SubjectId { get; set; }

        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [Column("is_active_backend")]
        public bool IsActiveBackend { get; set; } = true;

        [Column("is_active_frontend")]
        public bool IsActiveFrontend { get; set; } = true;

        [Column("start_active_datetime")]
        public DateTime? StartActiveDatetime { get; set; }

        [Column("end_active_datetime")]
        public DateTime? EndActiveDatetime { get; set; }

        [Column("display_order")]
        public int DisplayOrder { get; set; } = 0;
    }
}
