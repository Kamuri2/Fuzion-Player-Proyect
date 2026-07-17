const artistName = 'Ado';
fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}`)
  .then(res => res.json())
  .then(data => {
    if (data && data.data && data.data.length > 0) {
      const bestMatch = data.data.sort((a, b) => {
         const aExact = (a.name || '').toLowerCase() === artistName.toLowerCase() ? 1 : 0;
         const bExact = (b.name || '').toLowerCase() === artistName.toLowerCase() ? 1 : 0;
         if (aExact !== bExact) return bExact - aExact;
         return (b.nb_fan || 0) - (a.nb_fan || 0);
      })[0];
      console.log('Best match:', bestMatch);
    }
  })
  .catch(console.error);
