# Plany zmian

## foldery podobnie do mattpocock/skills

fajne jest rozwiązane u niego, że każdy skills jest jako folder w root repo, więc korzystając z `npx skills add` może wskazywać `repo/username/dir`, też tak zróbmy

## jasne flow

widzę kilka niedociągnięć, co do flow, mam kilka uwag jak to można rozwiązać itp.:
- nie promujmy zmian w AGENTS.md, nie ruszamy tego pliku z założenia tego projektu, zamiast tego proponować będziemy dodanie .local/AGENTS.md i .docs/AGENTS.md - agenci sami heurestycznie lub na podstawie skillsów znajdą te agents i je wczytają
- zamiast docs/* folder będzie nazywać się .docs/* (ograniczy to kolizje)
- .docs/* przestaje być opcjonalny, ale opcjonalnym będzie jego pushowanie
  - agent w ramach skilla tworzącego powinien excludować w .git ten folder jeżeli taką ma user intencję (tak samo jak .local; ale .local zawsze)

## foldery

jak wskazałem wyżej, repo zmienić się ma na folder=skill, z wyjątkiem np. assets czy coś, ale to nieistotne
w .docs chcemy mieć AGENTS.md i foldery:
- spec - opis oczekiwanego stanu projektu, z poziomu biznesowego, ale także czasami techniczne, czyli wszystko to na czym zależy klientowi
- meetings - każde spotkanie ma tworzyć nowy plik md z zapiskami, wymaganiami, oczekiwaniami, rzeczami do sprawdzenia, wątpliwościami, tematami na przyszłość itp.
- templates - wzory plików do innych miejsc jak do .local/issues itp.; jeżeli nie będzie jakiejś templatki tutaj to skillsy będą miały hardcodowane defaultowe templatki
- practices - podobne do speca, ale zamiast opisywać oczekiwany stan aplikacji, tutaj będą spisane promowane praktyki; folder jest opcjonalny a jego zawartość to pliki md z instrukcjami od poprzednich agentów dla przyszłych dot. praktyk kultywowanych w projekcie w kodzie lub meta praktyk jak nazwy commitów itp.

## skillsy

skille powinny mieć atomowe zadania, ale kompetentne, np.:
- skill do inicjacji flow Lotus
- skill do inicjacji .docs/spec
- skill do przepisywania .docs/meetings/_draft.md -> .docs/meetings/<date>.md w sposób ustruktyrozowany i pytając usera o doprecyzowanie kwestii (po czym czyści _draft.md)
- skill do pullowania zadań/komentarzy do PR/PR/wyników PR CI/CD itp. za pomocą komend `gh` oraz `acli` do standardu naszego
- itp.

## zbędne

po przemyśleniu chcę odchudzić kilka kwestii:
- questions są fajnym pomysłem, ale ich stan wymaga asynchronicznej interakcji z człowiekiem, agentowe narzędzia robią to out-of-the-box, usunąłbym ten pomysł
- przechodzywanie `runs` też bym usunął, bo prawdopodobnie będą tam same śmieci, a notes, spec, meetings itp. powinny pokryć potrzebę wskrzeszania
- tak samo context.md itp., każdy prompt ma być traktowany na równi, flow które zapewnić chcemy mają na celu skrócenie "prompt->sensowne zmiany"

## zła forma w tekście

teksty w skillsach/agents itp. powinny być neutralne i realne (to też trzeba poprawić w naszym AGENTS.md) bo:
- w jednym pliku jest tekst `Use these conventions instead of configuring path names:` to jest pewnie pokłosie tego, że usuwaliśmy konfiguracje, ale konfiguracja w statusie quo NIE ISTNIEJE, więc wspominanie o niej jest błędem merytorycznym
- format tekstu ma ładnie wskazywać i nakazywać zasady i oczekiwania

## `agents_to_copy` zbyt skomplikowany

aktualnie agents to copy jest zbyt chaotyczny, skomplikowany i nieczytelny, nie tłumaczy wielu założeń, które wprowadza. tekst ten powinien być lepiej sformatowany, lepiej pasować do nowej wersji, którą wprowadzimy i sam plik prawdopodobnie będzie w innym miejscu i będzie się inaczej nazywał

## nowe skillsy

chcę dodać więcej skillsów które ułatwią utrzymanie takiego flow, nie mówię tutaj o rozbijaniu tego co mamy (bo zależy mi na uproszczeniu), ale więcej odrębnych skillsów inspirowanych np. `mattpocock/skills` czy inne jakie zaproponujesz może nie będą złym pomysłem