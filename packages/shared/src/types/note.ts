export interface NoteDto {
  clientKey: string;
  title: string;
  body: string;
  deleted: boolean;
  updatedAt: string;
}

export interface NoteSyncItem {
  clientKey: string;
  title: string;
  body: string;
  deleted: boolean;
  updatedAt: string;
}

export interface NoteSyncRequest {
  items: NoteSyncItem[];
}

export interface NoteSyncResponse {
  serverItems: NoteDto[];
}

export interface NoteListResponse {
  items: NoteDto[];
}
