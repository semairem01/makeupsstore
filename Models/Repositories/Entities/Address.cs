// makeup.Models.Repositories.Entities/Address.cs
using System.ComponentModel.DataAnnotations;

namespace makeup.Models.Repositories.Entities;

public class Address
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public AppUser AppUser { get; set; } = null!;

    [MaxLength(50)]  public string Title { get; set; } = "Ev";
    [MaxLength(100)] public string FullName { get; set; } = "";
    [MaxLength(20)]  public string Phone { get; set; } = "";

    // dataset id'leri (numeric)
    public int CityId { get; set; }
    public int DistrictId { get; set; }
    public int NeighborhoodId { get; set; }

    [MaxLength(120)] public string Street { get; set; } = "";       // Cadde/Sokak
    [MaxLength(20)]  public string? BuildingNo { get; set; }         // No
    [MaxLength(20)]  public string? ApartmentNo { get; set; }        // Daire
    [MaxLength(10)]  public string PostalCode { get; set; } = "";
    [MaxLength(200)] public string? Notes { get; set; }
    
    public bool IsDefault { get; set; } = false;
}