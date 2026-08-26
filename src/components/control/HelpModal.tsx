export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">OBS Lite ヘルプ</h2>
          <button onClick={onClose} className="px-3 py-1 bg-zinc-800 rounded">
            閉じる
          </button>
        </div>
        <div className="space-y-3 text-sm leading-relaxed">
          <section>
            <h3 className="font-bold text-sky-400">基本操作（タブ切替なし）</h3>
            <ul className="list-disc list-inside text-zinc-300">
              <li>ソースをクリックでNEXT（黄）→ Space or TAKEでLIVE（赤）へ送出</li>
              <li>出力ウィンドウをプロジェクター側にドラッグして全画面</li>
              <li>同一PC: 自動で同期 / 別PC: Roomコードで同期（WS:connectedで確認）</li>
            </ul>
          </section>
          <section>
            <h3 className="font-bold text-sky-400">ショートカット</h3>
            <ul className="list-disc list-inside text-zinc-300">
              <li>Space: TAKE / B: BLACK / 1-9: ソース選択 / ←→: スライド前後（選択時）</li>
            </ul>
          </section>
          <section>
            <h3 className="font-bold text-sky-400">スマホ生中継</h3>
            <p className="text-zinc-300">+スマホカメラ→QRをスマホで読取→配信中になればControlでTAKE。Wi-Fi/モバイル両対応。</p>
          </section>
          <section>
            <h3 className="font-bold text-sky-400">Canva</h3>
            <p className="text-zinc-300">+画面共有→画面共有開始→ChromeタブでCanvaを選択→Canvaで再生すればそのまま投影。</p>
          </section>
          <section>
            <h3 className="font-bold text-sky-400">透過テロップ+PIP</h3>
            <p className="text-zinc-300">透過PNG（くり抜きフレーム）を常時テロップに登録し、PIPで動画/カメラをくり抜き位置にドラッグで合わせて配置。</p>
          </section>
          <section>
            <h3 className="font-bold text-sky-400">保存</h3>
            <p className="text-zinc-300">ヘッダー「保存」でJSON保存、「読込」で復元。リハーサル→本番の切替に。</p>
          </section>
        </div>
      </div>
    </div>
  )
}
