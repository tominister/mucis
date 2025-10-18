# Rename drum sample files to remove special characters and spaces

# Rename snare file
$snarePath = "drumset\snare"
$snareFiles = Get-ChildItem -Path $snarePath -Filter "*.wav"
foreach ($file in $snareFiles) {
    Rename-Item -Path $file.FullName -NewName "clap_reddot.wav"
    Write-Host "Renamed snare file to: clap_reddot.wav"
}

# Rename hi-hat file
$hihatPath = "drumset\hi hat"
$hihatFiles = Get-ChildItem -Path $hihatPath -Filter "*.wav"
foreach ($file in $hihatFiles) {
    Rename-Item -Path $file.FullName -NewName "hihat_invention.wav"
    Write-Host "Renamed hi-hat file to: hihat_invention.wav"
}

# Rename hi-hat folder
Rename-Item -Path "drumset\hi hat" -NewName "hihat"
Write-Host "Renamed folder 'hi hat' to 'hihat'"

Write-Host "All files renamed successfully!"
