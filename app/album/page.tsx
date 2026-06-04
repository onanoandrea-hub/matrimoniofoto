import { GalleryView } from "@/components/GalleryView";

export const metadata = {
  title: "Album",
  robots: { index: false, follow: false },
};

export default function AlbumPage() {
  return (
    <main className="page page--gallery">
      <article className="card card--wide">
        <GalleryView />
      </article>
    </main>
  );
}
