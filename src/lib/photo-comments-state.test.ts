import { describe, expect, it } from "vitest";
import {
  reconcileAlbumComments,
  removeAlbumComment,
  upsertAlbumComment,
  type AlbumCommentRow,
} from "./photo-comments-state";

const first: AlbumCommentRow = {
  id: "one",
  photo_id: "photo",
  user_id: "person-a",
  commenter_name: "Person A",
  comment_text: "First",
  created_at: "2026-09-02T12:00:00.000Z",
};

const second: AlbumCommentRow = {
  id: "two",
  photo_id: "photo",
  user_id: "person-b",
  commenter_name: "Person B",
  comment_text: "Second",
  created_at: "2026-09-02T12:01:00.000Z",
};

describe("album comment state", () => {
  it("shows a committed insert immediately without duplicating it", () => {
    expect(upsertAlbumComment([], second)).toEqual([second]);
    expect(upsertAlbumComment([second], second)).toEqual([second]);
  });

  it("keeps a newly committed comment when a stale refresh omits it", () => {
    expect(reconcileAlbumComments([first], [second])).toEqual([first, second]);
  });

  it("uses the authoritative refreshed row for a committed id", () => {
    const refreshed = { ...second, commenter_name: "Authoritative name" };
    expect(reconcileAlbumComments([first, refreshed], [])).toEqual([first, refreshed]);
  });

  it("removes only the specified comment", () => {
    expect(removeAlbumComment([first, second], first.id)).toEqual([second]);
  });
});