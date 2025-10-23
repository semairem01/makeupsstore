using System.Text.Json;

public record CityRow(string sehir_id, string sehir_adi);
public record DistrictRow(string ilce_id, string ilce_adi, string sehir_id, string sehir_adi);
public record NeighborhoodRow(string mahalle_id, string mahalle_adi, string ilce_id, string ilce_adi, string sehir_id, string sehir_adi);

public sealed class GeoFileStore
{
    private readonly IWebHostEnvironment _env;
    private List<CityRow>? _cities;
    private List<DistrictRow>? _districts;
    // mahalleler çok büyük olduğundan parçalı okunacak (lazy)

    public GeoFileStore(IWebHostEnvironment env) { _env = env; }

    string P(string file) => Path.Combine(_env.WebRootPath, "data", file);

    public async Task<List<CityRow>> GetCitiesAsync()
    {
        if (_cities != null) return _cities;
        _cities = await Load<List<CityRow>>("sehirler.json");
        return _cities!;
    }

    public async Task<List<DistrictRow>> GetDistrictsAsync()
    {
        if (_districts != null) return _districts;
        _districts = await Load<List<DistrictRow>>("ilceler.json");
        return _districts!;
    }

    public async IAsyncEnumerable<NeighborhoodRow> StreamNeighborhoodsAsync()
    {
        // büyük dosyaları tek tek stream et
        foreach (var file in new[] { "mahalleler-1.json", "mahalleler-2.json", "mahalleler-3.json", "mahalleler-4.json" })
        {
            await foreach (var n in StreamArray<NeighborhoodRow>(P(file)))
                yield return n;
        }
    }

    public async Task<List<NeighborhoodRow>> GetNeighborhoodsByDistrictAsync(string ilceId)
    {
        var result = new List<NeighborhoodRow>(512);
        await foreach (var n in StreamNeighborhoodsAsync())
            if (n.ilce_id == ilceId) result.Add(n);
        return result.OrderBy(x => x.mahalle_adi, StringComparer.Create(new System.Globalization.CultureInfo("tr-TR"), true)).ToList();
    }

    private async Task<T> Load<T>(string file)
    {
        var json = await File.ReadAllTextAsync(P(file));
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }

    private static async IAsyncEnumerable<T> StreamArray<T>(string path)
    {
        await using var fs = File.OpenRead(path);
        using var doc = await JsonDocument.ParseAsync(fs);
        foreach (var el in doc.RootElement.EnumerateArray())
            yield return el.Deserialize<T>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }
}
