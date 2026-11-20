using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("trn_training_result")]
    public class TrnTrainingResult
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("nation_id")]
        [MaxLength(13)]
        public string? NationId { get; set; }

        [Column("person_registration_id")]
        public int? PersonRegistrationId { get; set; }

        [Column("original_license_no")]
        [MaxLength(50)]
        public string? OriginalLicenseNo { get; set; }

        [Column("training_course_code")]
        [MaxLength(100)]
        public string? TrainingCourseCode { get; set; }

        [Column("training_course_name")]
        [MaxLength(500)]
        public string? TrainingCourseName { get; set; }

        [Column("subject_names")]
        [MaxLength(1000)]
        public string? SubjectNames { get; set; }

        [Column("training_date_display")]
        [MaxLength(100)]
        public string? TrainingDateDisplay { get; set; }

        [Column("training_status")]
        [MaxLength(50)]
        public string? TrainingStatus { get; set; }

        [Column("deduction_privilege")]
        [MaxLength(10)]
        public string? DeductionPrivilege { get; set; }

        [Column("deduction_doc_status")]
        [MaxLength(50)]
        public string? DeductionDocStatus { get; set; }

        [Column("progress_percent")]
        [MaxLength(20)]
        public string? ProgressPercent { get; set; }

        [Column("score_percent")]
        [MaxLength(20)]
        public string? ScorePercent { get; set; }

        [Column("enrollment_url")]
        [MaxLength(1000)]
        public string? EnrollmentUrl { get; set; }

        [Column("verified_title_th")]
        [MaxLength(100)]
        public string? VerifiedTitleTh { get; set; }

        [Column("verified_first_name_th")]
        [MaxLength(200)]
        public string? VerifiedFirstNameTh { get; set; }

        [Column("verified_last_name_th")]
        [MaxLength(200)]
        public string? VerifiedLastNameTh { get; set; }

        [Column("verified_license_no")]
        [MaxLength(50)]
        public string? VerifiedLicenseNo { get; set; }

        [Column("verified_license_issue_date")]
        [MaxLength(50)]
        public string? VerifiedLicenseIssueDate { get; set; }

        [Column("verified_license_expiry_date")]
        [MaxLength(50)]
        public string? VerifiedLicenseExpiryDate { get; set; }

        [Column("verified_applicant_type")]
        [MaxLength(100)]
        public string? VerifiedApplicantType { get; set; }

        [Column("verified_license_type")]
        [MaxLength(200)]
        public string? VerifiedLicenseType { get; set; }

        [Column("verified_insurance_type")]
        [MaxLength(200)]
        public string? VerifiedInsuranceType { get; set; }

        [Column("stamp_date")]
        public DateTime StampDate { get; set; } = DateTime.Now;

        [Column("import_file_name")]
        [MaxLength(500)]
        public string? ImportFileName { get; set; }

        [Column("is_data_mismatch")]
        [MaxLength(10)]
        public string IsDataMismatch { get; set; } = "N";

        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        public Person? Person { get; set; }

        [ForeignKey("PersonRegistrationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        public PersonRegistration? PersonRegistration { get; set; }
    }
}
