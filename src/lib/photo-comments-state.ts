export type AlbumCommentRow = {
  id: string;
  photo_id: string;
  user_id: string;
  commenter_name: string;
  comment_text: string;
  created_at: string;
};

export function upsertAlbumComment<T extends AlbumCommentRow>(rows: T[], incoming: T): T[] {
  const next = rows.filter((row) => row.id !== incoming.id);
  next.push(incoming);
  return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function removeAlbumComment<T extends AlbumCommentRow>(rows: T[], id: string): T[] {
  return rows.filter((row) => row.id !== id);
}

export function reconcileAlbumComments<T extends AlbumCommentRow>(
  remoteRows: T[],
  committedRows: Iterable<T>,
): T[] {
  let reconciled = [...remoteRows];
  for (const committed of committedRows) {
    reconciled = upsertAlbumComment(reconciled, committed);
  }
  return reconciled.sort((a, b) => a.created_at.localeCompare(b.created_at));
}