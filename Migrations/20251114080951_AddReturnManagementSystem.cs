using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace makeup.Migrations
{
    /// <inheritdoc />
    public partial class AddReturnManagementSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ReturnReviewDate",
                table: "Orders",
                newName: "ReturnShippedDate");

            migrationBuilder.AlterColumn<string>(
                name: "ShippingMethod",
                table: "Orders",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "standard",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldNullable: true,
                oldDefaultValue: "standard");

            migrationBuilder.AlterColumn<string>(
                name: "ShipNotes",
                table: "Orders",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ReturnItemsJson",
                table: "Orders",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RefundAmount",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundMethod",
                table: "Orders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RefundProcessedDate",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundTransactionId",
                table: "Orders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnAddress",
                table: "Orders",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReturnApprovedDate",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnCode",
                table: "Orders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReturnInspectedDate",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReturnReceivedDate",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnShippingInfo",
                table: "Orders",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnStatus",
                table: "Orders",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "None");

            migrationBuilder.AddColumn<string>(
                name: "ReturnTrackingNumber",
                table: "Orders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ReturnRequest",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RequestDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "Requested"),
                    AdminNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReviewedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnRequest", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReturnRequest_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReturnRequest_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_ReturnCode",
                table: "Orders",
                column: "ReturnCode",
                unique: true,
                filter: "[ReturnCode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequest_OrderId",
                table: "ReturnRequest",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequest_UserId",
                table: "ReturnRequest",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReturnRequest");

            migrationBuilder.DropIndex(
                name: "IX_Orders_ReturnCode",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RefundAmount",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RefundMethod",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RefundProcessedDate",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RefundTransactionId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnAddress",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnApprovedDate",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnCode",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnInspectedDate",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnReceivedDate",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnShippingInfo",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnStatus",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnTrackingNumber",
                table: "Orders");

            migrationBuilder.RenameColumn(
                name: "ReturnShippedDate",
                table: "Orders",
                newName: "ReturnReviewDate");

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
                oldDefaultValue: "standard");

            migrationBuilder.AlterColumn<string>(
                name: "ShipNotes",
                table: "Orders",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ReturnItemsJson",
                table: "Orders",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000,
                oldNullable: true);
        }
    }
}
