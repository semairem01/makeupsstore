using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace makeup.Migrations
{
    /// <inheritdoc />
    public partial class AddBeautyRoutineFieldsToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Coverage",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Finish",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "FragranceFree",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasSpf",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Longwear",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "NonComedogenic",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "PhotoFriendly",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ShadeFamily",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SuitableForSkin",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Tags",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Waterproof",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "ShippingMethod",
                table: "Orders",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true,
                defaultValue: "standard",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Coverage",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Finish",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "FragranceFree",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "HasSpf",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Longwear",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "NonComedogenic",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "PhotoFriendly",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ShadeFamily",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SuitableForSkin",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Tags",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Waterproof",
                table: "Products");

            migrationBuilder.AlterColumn<string>(
                name: "ShippingMethod",
                table: "Orders",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldNullable: true,
                oldDefaultValue: "standard");
        }
    }
}
