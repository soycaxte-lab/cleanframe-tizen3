"""Prepare a private, independent Tizen 3 widget. No signing or TV access."""
import argparse
import json
import secrets
import string
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape
from font_assets import ROOT, write_widget_archive

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--config', default='config/tv.example.json')
args = parser.parse_args()
config = json.loads((ROOT / args.config).read_text(encoding='utf-8-sig'))
local = ROOT / '.local'
local.mkdir(exist_ok=True)
identity_file = local / 'tv-identity.json'
if identity_file.exists():
    identity = json.loads(identity_file.read_text())
else:
    package = 'CF' + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
    identity = {'package': package, 'appId': package + '.CleanFrame'}
    identity_file.write_text(json.dumps(identity, indent=2) + '\n')
stage = local / 'tv-app'
# Replace only runtime files from the new export; never touch keys or identity.
archive = local / 'tv-base-unsigned.wgt'
write_widget_archive(archive, include_private=False)
with zipfile.ZipFile(archive) as widget:
    widget.extractall(stage)
manifest = (stage / 'config.xml').read_text(encoding='utf-8')
manifest = manifest.replace('nClrkHome1.FrameHome', identity['appId']).replace('nClrkHome1', identity['package'])
manifest = manifest.replace('required_version="6.5"', 'required_version="3.0"')
manifest = manifest.replace('https://local.frame-home/app', 'https://local.cleanframe.tv/' + identity['package'])
manifest = manifest.replace('<name>CleanFrame</name>', '<name>' + escape(config.pop('name', 'CleanFrame TV')) + '</name>')
(stage / 'config.xml').write_text(manifest, encoding='utf-8')
config['appId'] = identity['appId']
(stage / 'tv-profile.js').write_text('window.CleanFrameProfile = ' + json.dumps(config, ensure_ascii=True) + ';\n', encoding='utf-8')
html = (stage / 'index.html').read_text(encoding='utf-8')
assert '<script src="device.js"></script>' in html
html = html.replace('<script src="device.js"></script>', '<script src="tv-profile.js"></script>\n<script src="device.js"></script>')
(stage / 'index.html').write_text(html, encoding='utf-8')
for notice in ('LICENSE', 'THIRD_PARTY_NOTICES.md'):
    (stage / notice).write_bytes((ROOT / notice).read_bytes())
print('Preparado en .local/tv-app. Identidad: ' + identity['appId'])
print('Conserva .local/tv-identity.json para futuras actualizaciones. Aún no está firmado.')
