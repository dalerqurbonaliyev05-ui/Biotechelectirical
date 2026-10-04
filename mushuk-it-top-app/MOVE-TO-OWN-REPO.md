# Bu papka alohida repoga ko'chirilishi kerak

GitHub integratsiyasi yangi repo yarata olmadi (403), shuning uchun ilova vaqtincha shu yerda saqlanmoqda.
`mushuk-it-top-app` nomli bo'sh repo yaratgach (README/.gitignore'siz), ildizdan:

```bash
cd mushuk-it-top-app
git init -b main && git add -A && git commit -m "Mushuk va It Top ilovasi"
git remote add origin https://github.com/dalerqurbonaliyev05-ui/mushuk-it-top-app.git
git push -u origin main
```
So'ng bu papkani (`mushuk-it-top-app/`) Biotechelectirical repodan o'chiring. Workflow (`.github/workflows/build-apk.yml`) faqat repo ILDIZIDA ishlaydi.
