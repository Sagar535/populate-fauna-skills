const sanitized = (skillName) => encodeURIComponent(skillName.substring(1, skillName.length-1).toLowerCase())

module.exports = { sanitized }
