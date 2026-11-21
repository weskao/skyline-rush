/** Owner-only Wave 3 preview document; cleaned up in every build because earlier preview builds may have written it. */
export const WAVE3_PREVIEW_COLLECTION = 'wave3PreviewEconomy';

type CloudDeleteSteps = {
  checkAccount: () => void;
  commitBatch: () => Promise<unknown>;
  deletePreview: () => Promise<unknown>;
};

/**
 * The main batch commits first, so a project without preview rules can still delete an account.
 * permission-denied means no preview rule exists, so nothing could have been written there.
 */
export async function deleteCloudDocuments({ checkAccount, commitBatch, deletePreview }: CloudDeleteSteps) {
  checkAccount();
  await commitBatch();
  checkAccount();
  try {
    await deletePreview();
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code !== 'permission-denied') throw error;
  }
}
