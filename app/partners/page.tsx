import Link from "next/link";

const GITHUB_URL = "https://github.com/nylaimanii/nest";
const CONTACT_EMAIL = "nylaimanii7@gmail.com";

export default function PartnersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bone text-ink">
      <header className="h-16">
        <div className="mx-auto flex h-full max-w-[920px] items-center justify-between px-8">
          <Link
            href="/"
            className="font-serif text-[1.5rem] lowercase text-ink"
          >
            nest
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[0.8rem] text-muted transition-colors hover:text-ink"
          >
            github
          </a>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-8">
        <div className="flex max-w-[42ch] flex-col items-center gap-6 text-center">
          <h1 className="font-serif text-[2rem] leading-[1.2] lowercase text-ink">
            the partner letter arrives shortly.
          </h1>
          <p className="font-serif italic text-muted">
            {`step 11 of the build. write to nyla in the meantime: ${CONTACT_EMAIL}.`}
          </p>
          <Link
            href="/"
            className="mt-4 font-mono text-[0.85rem] text-muted transition-colors hover:text-ink"
          >
            ← back to nest
          </Link>
        </div>
      </main>
    </div>
  );
}
