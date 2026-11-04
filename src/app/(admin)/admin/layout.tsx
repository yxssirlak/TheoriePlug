import AdminShell from "../../../components/admin/AdminShell";

export default function AdminAreaLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
