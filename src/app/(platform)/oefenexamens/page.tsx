import ExamSimulator from "../../../components/dashboard/ExamSimulator";
import AuthenticatedPage from "../../../components/dashboard/AuthenticatedPage";

export default function Page() {
  return <AuthenticatedPage><ExamSimulator /></AuthenticatedPage>;
}
