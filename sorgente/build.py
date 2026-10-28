import base64, os, sys
W = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(W, '..', 'assets')
rd = lambda p: open(os.path.join(W, p), encoding='utf-8').read()
b64 = lambda p: base64.b64encode(open(os.path.join(A, p), 'rb').read()).decode()

tpl = rd('app.template.html')
body = (tpl
        .replace('__ENGINE__', rd('engine.js'))
        .replace('__COMUNI__', rd('comuni.js'))
        .replace('__FIRMA_B64__', b64('MrDafoe-Regular.ttf'))
        .replace('__PLANIMETRIA_B64__', b64('planimetria.jpg'))
        .replace('__APP__', rd('app.js')))

cdn = ('<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"></script>\n'
       '<script src="https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js"></script>')
artifact = body.replace('__LIBS__', cdn)
open(os.path.join(W, 'dist', 'contratto-cathalia.html'), 'w', encoding='utf-8').write(artifact)

# copia autonoma: librerie incluse, funziona anche senza internet
libs = ('<script>' + rd('node_modules/pdf-lib/dist/pdf-lib.min.js') + '</script>\n<script>' +
        rd('node_modules/@pdf-lib/fontkit/dist/fontkit.umd.min.js') + '</script>')
alone = body.replace('__LIBS__', libs)
head = ('<!doctype html><html lang="it"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>'
        '</head><body>')
open(os.path.join(W, 'dist', 'Compila contratto CaThalia.html'), 'w', encoding='utf-8').write(head + alone + '</body></html>')
# sito pubblico (GitHub Pages): librerie come file a parte, icona per la schermata Home
sito = os.path.join(W, 'dist', 'sito')
os.makedirs(sito, exist_ok=True)
import shutil
shutil.copy(os.path.join(W, 'node_modules/pdf-lib/dist/pdf-lib.min.js'), sito)
shutil.copy(os.path.join(W, 'node_modules/@pdf-lib/fontkit/dist/fontkit.umd.min.js'), sito)
head_sito = ('<!doctype html><html lang="it"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="robots" content="noindex,nofollow">'
        '<meta name="theme-color" content="#2d5b47">'
        '<meta name="apple-mobile-web-app-capable" content="yes">'
        '<meta name="mobile-web-app-capable" content="yes">'
        '<meta name="apple-mobile-web-app-title" content="Contratto">'
        '<link rel="apple-touch-icon" href="icon-180.png"><link rel="icon" href="icon-180.png">'
        '<link rel="manifest" href="manifest.webmanifest">'
        '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>'
        '</head><body>')
pagina = body.replace('__LIBS__', '<script src="pdf-lib.min.js"></script>\n<script src="fontkit.umd.min.js"></script>')
open(os.path.join(sito, 'index.html'), 'w', encoding='utf-8').write(head_sito + pagina + '</body></html>')
open(os.path.join(sito, 'manifest.webmanifest'), 'w', encoding='utf-8').write(
    '{"name":"Contratto Ca\'Thalia","short_name":"Contratto","start_url":"./","display":"standalone",'
    '"background_color":"#e9eee8","theme_color":"#2d5b47","lang":"it",'
    '"icons":[{"src":"icon-180.png","sizes":"180x180","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"}]}')
for f in os.listdir(os.path.join(W, 'dist')):
    print(f, os.path.getsize(os.path.join(W, 'dist', f)))
