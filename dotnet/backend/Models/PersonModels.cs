#pragma warning disable CS8618

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("person")]
    public class Person
    {
        [Key]
        [Column("NationId")]
        [StringLength(13)]
        public string? NationId { get; set; }

        public DateTime? IdCardExpiry { get; set; }
        public string? TitleTh { get; set; }
        public string? FirstNameTh { get; set; }
        public string? MiddleNameTh { get; set; }
        public string? LastNameTh { get; set; }
        public string? TitleOldTh { get; set; }
        public string? FirstNameOldTh { get; set; }
        public string? MiddleNameOldTh { get; set; }
        public string? LastNameOldTh { get; set; }
        public DateTime? BirthDate { get; set; }
        public int? ReligionId { get; set; }
        public int? GenderId { get; set; }
        public int? BloodGroupId { get; set; }
        public string? PhoneOtp { get; set; }
        public string? EmailAlt { get; set; }
        public string? LineId { get; set; }
        public string? Facebook { get; set; }
        public string? Instagram { get; set; }
        public string? FoodAllergy { get; set; }
        public string? MedicalCondition { get; set; }
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        [Column("Remark")]
        public string? Remark { get; set; }

        // Navigation properties
        public ICollection<PersonRegistration> Registrations { get; set; } = new List<PersonRegistration>();
        public ICollection<PersonAddress> Addresses { get; set; } = new List<PersonAddress>();
        public ICollection<PersonLicense> Licenses { get; set; } = new List<PersonLicense>();
        public ICollection<PersonAffiliation> Affiliations { get; set; } = new List<PersonAffiliation>();
        public ICollection<PersonCourse> Courses { get; set; } = new List<PersonCourse>();
        public ICollection<PersonTraining5y> Trainings { get; set; } = new List<PersonTraining5y>();
        public ICollection<PersonOther> Others { get; set; } = new List<PersonOther>();
        public ICollection<PersonDocument> Documents { get; set; } = new List<PersonDocument>();
        public ICollection<RegistrationHistoryModel> RegistrationHistories { get; set; } = new List<RegistrationHistoryModel>();
        public ICollection<TrnTrainingResult> TrainingResults { get; set; } = new List<TrnTrainingResult>();
    }

    [Table("personregistration")]
    public class PersonRegistration
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public bool? PdpaConsent { get; set; }
        public DateTime? start_time { get; set; }
        public DateTime? completion_time { get; set; }
        public bool? confirmed { get; set; }
        public string? DeductionPrivilege { get; set; }
        public string? MasterDegreeStatus { get; set; }

        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }

        public ICollection<TrnTrainingResult> TrainingResults { get; set; } = new List<TrnTrainingResult>();
    }

    [Table("personaddress")]
    public class PersonAddress
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public string? HouseNo { get; set; }
        public string? Moo { get; set; }
        public string? Village { get; set; }
        public string? Soi { get; set; }
        public string? Road { get; set; }
        public int? ProvinceId { get; set; }
        public int? DistrictId { get; set; }
        public int? SubDistrictId { get; set; }
        public string? Postcode { get; set; }
        public string? AddressTypeText { get; set; }
        public string? AddressType { get; set; }

        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }
    }

    [Table("personlicense")]
    public class PersonLicense
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public string? LicenseNo { get; set; }
        public DateTime? LicenseIssueDate { get; set; }
        public DateTime? LicenseExpiryDate { get; set; }
        public string? CourseType { get; set; }
        public string? CourseTypeCode { get; set; }

        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }
    }

    [Table("personaffiliation")]
    public class PersonAffiliation
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public int? RegionId { get; set; }
        public int? BranchId { get; set; }
        public string? BrokerCompany { get; set; }
        public string? BrokerBranch { get; set; }
        public string? ViriyahAgentCode { get; set; }
        public string? BrokerType { get; set; }

        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }
    }

    [Table("personcourse")]
    public class PersonCourse
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int PersonCourseId { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public int? CourseId { get; set; }
        public int? CourseDateId { get; set; }
        public int? RenewOtherId { get; set; }

        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }
    }

    [Table("persontraining5y")]
    public class PersonTraining5y
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public int? CourseId { get; set; }

        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }
    }

    [Table("personother")]
    public class PersonOther
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int id { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public string? ExtraTrainingInterest { get; set; }
        public string? OtherBusiness { get; set; }
        public string? BrokerBranch { get; set; }
        public int? InsuranceExperienceYears { get; set; }

        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }

        public ICollection<PersonOtherSalesArea> SalesAreas { get; set; } = new List<PersonOtherSalesArea>();
        public ICollection<PersonOtherCompanies> OtherCompanies { get; set; } = new List<PersonOtherCompanies>();
        public ICollection<PersonOtherSpecialty> Specialties { get; set; } = new List<PersonOtherSpecialty>();
    }

    [Table("personothersalesarea")]
    public class PersonOtherSalesArea
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int? OtherId { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public int? TerritoriesId { get; set; }

        [ForeignKey("OtherId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public PersonOther? PersonOther { get; set; }
        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }
    }

    [Table("personothercompanies")]
    public class PersonOtherCompanies
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int? OtherId { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public int? CompanyId { get; set; }

        [ForeignKey("OtherId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public PersonOther? PersonOther { get; set; }
        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }
    }

    [Table("personotherspecialty")]
    public class PersonOtherSpecialty
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int? OtherId { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public int? ExpertiseId { get; set; }

        [ForeignKey("OtherId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public PersonOther? PersonOther { get; set; }
        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }
    }

    [Table("registrationhistory")]
    public class RegistrationHistoryModel
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int? RegisterId { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public string? EditedByType { get; set; }
        public string? CreatedBy { get; set; }
        public string? OldData { get; set; }
        public string? NewData { get; set; }
        public DateTime? CreatedAt { get; set; }

        [ForeignKey("RegisterId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public PersonRegistration? PersonRegistration { get; set; }
        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }
    }

    [Table("persondocument")]
    public class PersonDocument
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        [StringLength(13)]
        public string? NationId { get; set; }
        public string? DocumentType { get; set; } // e.g. "Profile", "IDCard", "IDCardFace"
        public string? FilePath { get; set; }
        public byte[]? FileData { get; set; }
        public string? ContentType { get; set; }
        public DateTime? UploadedAt { get; set; }

        [ForeignKey("NationId")]
        [System.Text.Json.Serialization.JsonIgnore]
        [Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidateNever]
        public Person? Person { get; set; }
    }
}
