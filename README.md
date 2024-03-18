# MFA Manager

I created this because I got sick of having to reach for my phone for TOTP codes. Kind of defeats the purpose of MFA, but...

# Setup

    git clone https://github.com/alexmgriffiths/mfamanager.git
    cd mfamanager
    npm i
    npm run build

Then go in Firefox, navigate to `about:debugging` and load `build/manifest.json` as a temporary addon.