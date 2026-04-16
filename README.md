# Lotus Agents

<p align="center">
  <img src="./assets/logo.webp" alt="Lotus Agents logo" width="220">
</p>

Lotus Agents to prosty sposób na uporządkowanie pracy człowieka i agenta w repo.
Zamiast wrzucać wszystko do jednego miejsca, rozdziela prywatne notatki robocze
od trwałych ustaleń projektu:

- `.local/` na lokalną pracę agenta
- `.docs/` na to, co warto zachować jako wiedzę o projekcie

## Szybki start

Zainstaluj główny skill:

```bash
npx skills add https://github.com/MrMaxie/lotus-agents --skill lotus-agents
```

Jeśli chcesz od razu wystartować setup repo:

```bash
npx skills add https://github.com/MrMaxie/lotus-agents --skill lotus-init
```

Po instalacji zrestartuj Codex.

Repo wystawia też natywny manifest pluginu w
`.codex-plugin/plugin.json`, jeśli wolisz ten sposób instalacji.

## Jak to działa

Model jest celowo mały:

```text
repo/
  .local/
    AGENTS.md
    issues/
    issues-notes/
    reviews/
    pr-notes/
  .docs/
    AGENTS.md
    spec/
    meetings/
      _draft.md
    templates/
    practices/   # opcjonalnie
```

`.local/` to prywatna warstwa robocza. Zwykle powinna być ignorowana przez Git.

`.docs/` to warstwa projektu. Trzymasz tam spec, notatki ze spotkań i wzorce
przydatne w danym repo. Możesz ją commitować albo zostawić lokalnie, zależnie od
tego jak chcesz prowadzić projekt.

## Jakich skilli używać

- `$lotus-agents`:
  punkt wejścia, gdy chcesz żeby Codex sam dobrał właściwy flow
- `$lotus-init`:
  zakłada bazowy układ `.local/` i `.docs/`
- `$lotus-spec-init`:
  start dla `.docs/spec/`
- `$lotus-meeting-promote`:
  zamienia `.docs/meetings/_draft.md` w uporządkowaną notatkę ze spotkania
- `$lotus-pr-intake`:
  zbiera issue, PR, review i CI do artefaktów Lotus

Jeśli nie wiesz od czego zacząć, zacznij od `$lotus-agents` albo `$lotus-init`.

## Adopcja ręczna

Jeśli nie chcesz instalować skilli, możesz wdrożyć Lotus ręcznie:

1. skopiuj `lotus-init/assets/local-agents.md` do `.local/AGENTS.md`
2. skopiuj `lotus-init/assets/docs-agents.md` do `.docs/AGENTS.md`
3. utwórz katalogi:
   - `.local/issues/`
   - `.local/issues-notes/`
   - `.local/reviews/`
   - `.local/pr-notes/`
   - `.docs/spec/`
   - `.docs/meetings/`
   - `.docs/templates/`
4. utwórz `.docs/meetings/_draft.md` z
   `lotus-init/assets/meetings-draft-template.md`
5. dodaj `.local/` do `.git/info/exclude` albo `.gitignore`
6. zdecyduj, czy `.docs/` ma być commitowane, czy lokalne

## Co jest w repo

Najważniejsze rzeczy:

- `README.md`:
  szybkie wejście dla człowieka
- `AGENTS.md`:
  zasady pracy w tym repo
- `lotus-*/`:
  właściwe skille i ich assety

Jeśli chcesz wejść w szczegóły, czytaj:

- `AGENTS.md` dla zasad repo
- `lotus-*/SKILL.md` dla zachowania konkretnych skilli
