const analyzeIncident = ({ title, description, type }) => {
  const text = `${title} ${description}`.toLowerCase();

  // High Priority Keywords
  const highKeywords = ['server down', 'cannot access', 'critical error', 'sistem down', 'error kritis', 'tidak bisa akses'];
  let highScore = 0;
  highKeywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'g');
    highScore += (text.match(regex) || []).length;
  });

  // Medium Priority Keywords
  const mediumKeywords = ['slow', 'delay', 'response time', 'lambat', 'lama', 'terhambat'];
  let mediumScore = 0;
  mediumKeywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'g');
    mediumScore += (text.match(regex) || []).length;
  });

  // Determine Priority
  let priority = 'Low';
  let recommendation = 'Pantau laporan dan tindak lanjuti jika terjadi berulang.';

  if (highScore > 0) {
    priority = 'High';
    recommendation = 'Segera eskalasi ke tim IT dan lakukan pengecekan server.';
  } else if (mediumScore > 0) {
    priority = 'Medium';
    recommendation = 'Lakukan monitoring performa sistem dan evaluasi beban.';
  }

  return {
    priority,
    recommendation
  };
};

module.exports = { analyzeIncident };

