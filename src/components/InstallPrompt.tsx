/**
 * InstallPrompt.tsx — FAZA 14 (P2)
 *
 * Delovna aplikacija za teren: ponudi namestitev na domači zaslon (PWA) in
 * pokaže, ali je naprava povezana ali ne. Ob namestitvi aplikacija deluje
 * povsem brez omrežja (service worker + lokalna shramba).
 */
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Zadržimo dogodek, da lahko poziv za namestitev prikažemo sami.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (installed) return null;

  return (
    <div className="flex items-center gap-2">
      {!online && (
        <span
          className="text-xs bg-amber-900/40 text-amber-300 px-2 py-1 rounded"
          title="Aplikacija deluje lokalno, a povezava ni na voljo."
        >
          ⚠ Brez povezave
        </span>
      )}
      {deferred && (
        <button
          onClick={async () => {
            const prompt = deferred;
            setDeferred(null);
            try {
              await prompt.prompt();
              const choice = await prompt.userChoice;
              if (choice.outcome === 'accepted') setInstalled(true);
            } catch {
              // Namestitev je bila preklicana ali ni uspela — ni razloga za napako.
            }
          }}
          className="text-xs bg-blue-900/50 text-blue-300 hover:bg-blue-800/50 px-2 py-1 rounded"
          title="Namesti aplikacijo na domači zaslon za delo brez omrežja"
        >
          ⬇ Namesti
        </button>
      )}
    </div>
  );
}
