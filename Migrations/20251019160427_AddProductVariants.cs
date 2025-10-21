using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace makeup.Migrations
{
    /// <inheritdoc />
    public partial class AddProductVariants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VariantId",
                table: "OrderItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VariantId",
                table: "CartItems",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductVariants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Sku = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Barcode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ShadeCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    ShadeFamily = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    HexColor = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: true),
                    SwatchImageUrl = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    StockQuantity = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVariants_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_VariantId",
                table: "OrderItems",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_VariantId",
                table: "CartItems",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ProductId_IsDefault",
                table: "ProductVariants",
                columns: new[] { "ProductId", "IsDefault" },
                unique: true,
                filter: "[IsDefault] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ProductId_Sku",
                table: "ProductVariants",
                columns: new[] { "ProductId", "Sku" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CartItems_ProductVariants_VariantId",
                table: "CartItems",
                column: "VariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_ProductVariants_VariantId",
                table: "OrderItems",
                column: "VariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CartItems_ProductVariants_VariantId",
                table: "CartItems");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_ProductVariants_VariantId",
                table: "OrderItems");

            migrationBuilder.DropTable(
                name: "ProductVariants");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_VariantId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_CartItems_VariantId",
                table: "CartItems");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "CartItems");
        }
    }
}
