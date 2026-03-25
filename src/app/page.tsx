import { TypingArea } from "@/components/TypingArea";

export default function Page() {
  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-neutral-100 dark:bg-neutral-950 z-10 w-full overflow-hidden">
      <div className="w-full flex-1 flex flex-col items-center py-12">
        <TypingArea pageNumber={1} />
      </div>
    </main>
  );
}
