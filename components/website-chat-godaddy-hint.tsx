export function WebsiteChatGodaddyHint() {
  const snippet = `<script src="https://admin.i-smartmusic.com/website-chat.js" async></script>`;

  return (
    <details className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
      <summary className="cursor-pointer font-medium text-gray-900 dark:text-white">
        Connect the live GoDaddy website
      </summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>
          In GoDaddy Website Builder, turn off the built-in Chat widget
          (Shortcuts → Chat).
        </li>
        <li>
          In GoDaddy Website Builder, open Settings and look for Header / Footer
          HTML or Custom code. If that is missing, add an HTML section in the
          footer instead.
        </li>
        <li>Paste this line, then publish:</li>
      </ol>
      <pre className="mt-3 overflow-x-auto rounded-md bg-white p-3 text-xs text-gray-800 dark:bg-black/40 dark:text-gray-200">
        {snippet}
      </pre>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        After this admin app is deployed, visitors on i-smartmusic.com will chat
        here. Older GoDaddy Conversations threads stay in the GoDaddy inbox.
      </p>
    </details>
  );
}
