import ExamView from "../../../components/dashboard/ExamView";
import AuthenticatedPage from "../../../components/dashboard/AuthenticatedPage";

export default function Page() {
  return <AuthenticatedPage><ExamView /></AuthenticatedPage>;
}
