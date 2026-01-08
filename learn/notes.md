manifest.json:
- extension capabilities
- extension config
- The only required keys are "manifest_version", "name", and "version".

content scripts:
- scripts to read and modify content of a page
- isolated
    - isolated from host page or other extension's content scripts
- declare them in manifest
- declare what pages they can run in, in manifest "matches"
    - uses match patterns

main page: 
https://wd10.myworkday.com/ubc/d/home.htmld
academics: 
https://wd10.myworkday.com/ubc/d/inst/13102!CK5mGhIKBggDEMenAhIICgYI1A0Q6AI~*3dPGcpewsCo~/cacheable-task/23819$44.htmld#backheader=true&TABINDEX=0
view my grades: 
https://wd10.myworkday.com/ubc/d/gateway.htmld?reloadToken=42f944bab4a5e8cacaf57083126e2acd40d2015c9d1bbd4681a55bc1ab38b2e6