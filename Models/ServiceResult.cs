namespace makeup.Models;

public class ServiceResult<T>
{
    public bool Success { get; set; }   // İşlem başarılı mı
    public string Message { get; set; } // Bilgilendirme veya hata mesajı
    public T Data { get; set; }         // Dönen veri (opsiyonel)

    public static ServiceResult<T> Ok(T data, string message = "")
    {
        return new ServiceResult<T> { Success = true, Message = message, Data = data };
    }

    public static ServiceResult<T> Fail(string message)
    {
        return new ServiceResult<T> { Success = false, Message = message };
    }
}