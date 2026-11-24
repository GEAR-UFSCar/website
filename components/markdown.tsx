import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Markdown dos artigos (042). react-markdown não renderiza HTML cru, então o
 * texto de um membro não vira script na tela de outro. GFM traz as tabelas
 * (a de decisões da página 00) e as listas de tarefa.
 */
export function Markdown({ texto }: { texto: string }) {
  return (
    <div className="max-w-[72ch] font-sans text-[15px] font-light leading-relaxed [&_a]:text-[var(--gear-amber)] [&_a]:underline [&_a]:underline-offset-4 [&_code]:font-mono [&_code]:text-[13px] [&_h1]:mt-8 [&_h1]:text-2xl [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-linha [&_h2]:pb-2 [&_h2]:text-xl [&_h3]:mt-6 [&_h3]:text-lg [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-linha [&_pre]:p-3 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // tabela larga rola sozinha no celular, sem empurrar a página
          table: ({ children }) => (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm [&_td]:border [&_td]:border-linha [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-linha [&_th]:bg-[var(--gear-navy)] [&_th]:p-2 [&_th]:text-left [&_th]:font-mono [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-[0.15em] [&_th]:text-[var(--gear-amber)]">
                {children}
              </table>
            </div>
          ),
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  )
}
