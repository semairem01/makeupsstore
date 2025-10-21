using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace makeup.Migrations
{
    /// <inheritdoc />
    public partial class AddVariantIdToProductReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProductReviews_UserId_ProductId",
                table: "ProductReviews");

            migrationBuilder.AddColumn<int>(
                name: "VariantId",
                table: "ProductReviews",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductReviews_ProductId_VariantId_UserId",
                table: "ProductReviews",
                columns: new[] { "ProductId", "VariantId", "UserId" },
                unique: true,
                filter: "[VariantId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReviews_UserId",
                table: "ProductReviews",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReviews_VariantId",
                table: "ProductReviews",
                column: "VariantId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductReviews_ProductVariants_VariantId",
                table: "ProductReviews",
                column: "VariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProductReviews_ProductVariants_VariantId",
                table: "ProductReviews");

            migrationBuilder.DropIndex(
                name: "IX_ProductReviews_ProductId_VariantId_UserId",
                table: "ProductReviews");

            migrationBuilder.DropIndex(
                name: "IX_ProductReviews_UserId",
                table: "ProductReviews");

            migrationBuilder.DropIndex(
                name: "IX_ProductReviews_VariantId",
                table: "ProductReviews");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "ProductReviews");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReviews_UserId_ProductId",
                table: "ProductReviews",
                columns: new[] { "UserId", "ProductId" },
                unique: true);
        }
    }
}
