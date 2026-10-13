import type { ReviewContent } from './bar-review';

export interface ReviewEditorData {
	sodas: { id: string; title: string; brand: string }[];
	existingSlugs: string[];
	reviews: ReviewContent[];
}
