import { Button, Paper } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRowSelectionModel,
} from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import type { Payment } from "../utils/types";
import { deletePayments } from "../supabase/actions";

export default function PaymentsTable({ payments }: { payments: Payment[] }) {
  const paginationModel = { page: 0, pageSize: 5 };
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [rows, setRows] = useState<Payment[]>(payments);

  useEffect(() => {
    setRows(payments);
  }, [payments]);

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "company_name", headerName: "Company name", flex: 1 },
    { field: "agreement_day", headerName: "Agreement date", flex: 1 },
    { field: "payment_delay", headerName: "Payment delay", flex: 1 },
    { field: "receiving_date", headerName: "Receiving date", flex: 1 },
    { field: "payment_amount", headerName: "Receiving amount (€)", flex: 1 },
  ];

  const handleDelete = async () => {
    try {
      if (!selectedRows.ids || selectedRows.ids.size === 0) {
        console.warn("No rows selected for deletion");
        return;
      }
      const idsToDelete = Array.from(selectedRows.ids).map((id) => String(id));

      const response = await deletePayments(idsToDelete);
      console.log(response);

      setRows((prevRows: Payment[]) =>
        prevRows.filter((row: Payment) => !idsToDelete.includes(row.id)),
      );

      setSelectedRows({
        type: "include",
        ids: new Set(),
      });
    } catch (error) {
      console.error("Error deleting rows:", error);
    }
  };

  return (
    <div className="flex flex-col overflow-x-auto">
      <Paper sx={{ height: 370, minWidth: 650 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{ pagination: { paginationModel } }}
          pageSizeOptions={[5, 10]}
          checkboxSelection
          rowSelectionModel={selectedRows}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedRows(newSelection);
          }}
          sx={{
            border: 0,
          }}
        />
      </Paper>
      <Button
        variant="contained"
        color="error"
        sx={{ width: 200, marginTop: 2 }}
        disabled={selectedRows.ids.size === 0}
        onClick={handleDelete}
      >
        Delete Selected ({selectedRows.ids.size})
      </Button>
    </div>
  );
}
