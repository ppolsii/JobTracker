import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { ApplicationDetailActions } from "@/features/applications/components/ApplicationDetailActions";
import { ApplicationNoteCreateButton } from "@/features/applications/components/ApplicationNoteCreateButton";
import { ApplicationNotesList } from "@/features/applications/components/ApplicationNotesList";
import { ApplicationStatusTimeline } from "@/features/applications/components/ApplicationStatusTimeline";
import { ApplicationNoteService } from "@/features/applications/services/application-note.service";
import { ApplicationPickerService } from "@/features/applications/services/application-picker.service";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export const metadata: Metadata = { title: "Application Details" };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const { id } = await params;

  const [applicationResult, historyResult, notesResult, pickerOptions] =
    await Promise.all([
      ApplicationService.getById(user.id, id),
      ApplicationStatusService.listHistory(user.id, id),
      ApplicationNoteService.list(user.id, id),
      ApplicationPickerService.getOptions(user.id),
    ]);

  if (!applicationResult.success) {
    notFound();
  }

  const application = applicationResult.data;
  const history = historyResult.success ? historyResult.data : [];
  const notes = notesResult.success ? notesResult.data : [];
  const { companies, cvVersions } = pickerOptions;

  const hasSalary =
    application.salary_min != null || application.salary_max != null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Back to applications"
            render={<Link href={ROUTES.APPLICATIONS} />}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{application.position}</h2>
            <p className="text-sm text-muted-foreground">
              {application.companies?.name ?? "—"}
            </p>
          </div>
        </div>
        <ApplicationDetailActions
          application={application}
          companies={companies}
          cvVersions={cvVersions}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col text-sm">
            <InfoRow
              label="Company"
              value={application.companies?.name ?? "—"}
            />
            <InfoRow
              label="CV Version"
              value={application.cv_versions?.name ?? "—"}
            />
            <InfoRow label="Location" value={application.location ?? "—"} />
            <InfoRow
              label="Job URL"
              value={
                application.job_url ? (
                  <a
                    href={application.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    {application.job_url}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow label="Work Mode" value={application.work_mode ?? "—"} />
            <InfoRow
              label="Employment Type"
              value={application.employment_type ?? "—"}
            />
            <InfoRow label="Source" value={application.source ?? "—"} />
            <InfoRow
              label="Application Date"
              value={application.application_date ?? "—"}
            />
            <InfoRow
              label="Salary"
              value={
                hasSalary
                  ? `${application.salary_min ?? "?"}–${application.salary_max ?? "?"} ${application.currency}`
                  : "—"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {application.current_status}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationStatusTimeline entries={history} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notes</CardTitle>
          <ApplicationNoteCreateButton applicationId={application.id} />
        </CardHeader>
        <CardContent>
          <ApplicationNotesList notes={notes} applicationId={application.id} />
        </CardContent>
      </Card>
    </div>
  );
}
