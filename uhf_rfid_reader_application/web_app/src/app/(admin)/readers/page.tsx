import { requireUser } from "@/server/auth/requireUser";
import { listReaders, getAttachmentOptions } from "@/server/services/readers/listReaders";
import { ReadersGrid } from "@/components/admin/ReadersGrid";

export default async function ReadersPage() {
  const user = await requireUser();
  const [readers, { attachmentOptions }] = await Promise.all([
    listReaders(user.companyId),
    getAttachmentOptions(user.companyId),
  ]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Reader Configuration</h1>
          <div className="sub">Manage and configure your RFID readers, one per gate lane or checkpoint.</div>
        </div>
      </div>

      <ReadersGrid initialReaders={readers} attachmentOptions={attachmentOptions} />
    </div>
  );
}
