using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace makeup.Migrations
{
    /// <inheritdoc />
    public partial class AddVariantIdToFavoriteProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FavoriteProducts_UserId_ProductId",
                table: "FavoriteProducts");

            migrationBuilder.AddColumn<int>(
                name: "VariantId",
                table: "FavoriteProducts",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FavoriteProducts_UserId_ProductId",
                table: "FavoriteProducts",
                columns: new[] { "UserId", "ProductId" },
                unique: true,
                filter: "\"VariantId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_FavoriteProducts_UserId_ProductId_VariantId",
                table: "FavoriteProducts",
                columns: new[] { "UserId", "ProductId", "VariantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FavoriteProducts_VariantId",
                table: "FavoriteProducts",
                column: "VariantId");

            migrationBuilder.AddForeignKey(
                name: "FK_FavoriteProducts_ProductVariants_VariantId",
                table: "FavoriteProducts",
                column: "VariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FavoriteProducts_ProductVariants_VariantId",
                table: "FavoriteProducts");

            migrationBuilder.DropIndex(
                name: "IX_FavoriteProducts_UserId_ProductId",
                table: "FavoriteProducts");

            migrationBuilder.DropIndex(
                name: "IX_FavoriteProducts_UserId_ProductId_VariantId",
                table: "FavoriteProducts");

            migrationBuilder.DropIndex(
                name: "IX_FavoriteProducts_VariantId",
                table: "FavoriteProducts");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "FavoriteProducts");

            migrationBuilder.CreateIndex(
                name: "IX_FavoriteProducts_UserId_ProductId",
                table: "FavoriteProducts",
                columns: new[] { "UserId", "ProductId" },
                unique: true);
        }
    }
}
