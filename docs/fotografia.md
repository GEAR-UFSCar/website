# Roteiro de fotografia

As fotos atuais são registros de celular em sala clara. Para o site ter cara de produto, os dois robôs precisam de um ensaio simples.

## Robôs (AI Rover e Navegador Mecanum)
- Fundo liso e fosco, escuro (cartolina preta ou tecido preto), sem objetos atrás.
- Uma luz principal lateral e uma luz de recorte por trás, para desenhar o contorno das rodas e da placa.
- Ângulo de três quartos, câmera na altura do robô; mais uma foto de frente e uma de detalhe (câmera, sensores).
- Formato paisagem 3:2, no mínimo 2400 px de largura, JPG de qualidade alta. O mesmo cenário nos dois robôs.
- Nomes: `ai-rover-hero.jpg`, `ai-rover-detalhe.jpg`, `mecanum-hero.jpg`, `mecanum-detalhe.jpg`, em `public/fotos/`.

## Pessoas
- Retrato de meio corpo, mesmo fundo e mesma luz para todos, em formato 4:5.
- Nome do arquivo: `time-<primeiro-nome>.jpg` em `public/fotos/time/`. Ao chegarem, trocam as iniciais em `components/time.tsx`.

## Onde cada foto entra
- `*-hero.jpg`: topo de cada projeto em `/projetos` e imagem de compartilhamento.
- `*-detalhe.jpg`: galeria do projeto.
- `time-*.jpg`: cartões de `/time`.
