# Exam Assignment, 1dv612

Application is deployed on [Digital Ocean](https://138.68.160.157/)

OBS!! Email notifikationerna bör fungera, men när jag skulle testa innan inlämning så fick jag "Invalid Login", fast det fungerat innan.

## How To:
1. Börja med att skapa en OAuth app och uppdatera .env med Client ID och Client Secret.
2. Uppdatera .env med mail och lösenord för den mail meddelanden ska skickas ifrån (ville inte skriva ut mail och lösenord här, men har lagt in på min applikation)
3. Uppdatera .env med en "secret" som kommer användas när du skapar Webhooks.
4. Använd applikationen!

- På startsidan kan man se sparade notifikationer (om det finns några) och ta bort dem när man har läst dem. 
- På startsidan kommer man även motta notifikationer när man använder applikationen.
- Under "Organizations" kan man välja en organisation och då skapas en webhook som lyssnar på eventen: issues, push, release och repository.
- Under "Settings" kan man ta bort webhooken (från mLab, inte GitHub), stänga av/på email notifikationer och välja vilka event som ska skickas via email.