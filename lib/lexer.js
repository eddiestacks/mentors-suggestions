module.exports = {
  pseudoPhrase: function(input, that) {
    if (input instanceof String) {
      console.log("Input must be String to convert pseudoPhrase");
      return false;
    }
    // Lowercase the given input 
    var lcaseInput = input.toLowerCase();

    // todo: detect urls and strip them out (8)

    // Remove some non-alphabetical characters (numbers and punctuation)
    // Strip the string of numbers and periods
    var noNumberInput = lcaseInput.split(/\d*\.\d+|\d+|(\.)/g).join(" ");
    // Strip punctuation. (second replace handles (does not account for acronyms)
    // var noPunctuationInput = noNumberInput.replace(/[\,\?\!\*\:\&\$\<\>\(\)\/\=\[\]\.\~\"\;]/ig, " ");//.replace(/\./ig, "");
    var noPunctuationInput = noNumberInput.replace(/[\.,\/#!$?%\^&\*;:{}=\-`’"~()<>\[\]+]/g, " "); //.replace(/\./ig, "");

    // Tokenize on whitespace and return an array of non-empty strings
    var tokenizedInput = _.filter(noPunctuationInput.split(/\s/), function(token) {
      return token.length > 0;
    });

    // Strip out stop words 
    //todo: (5) add to the list of excluding common words in zendesk domain (e.g. question,help) 
    var stopwords = that.I18n.t('stopwords.exclusions').split(',');
    var noStopwordInput = _.difference(tokenizedInput, stopwords);

    //todo: (4) Implement porter2 stemming algorithm @sprint2 
    // For each word in the noStopwordInput, we want it to be replaced with it's stem
    var Stemmer = require('stemmer.js');
    var stemmedInput = _.map(noStopwordInput, function(word) {
      return Stemmer.stem(word);
    });

    // Return an array of pseudophrases
    // var pseudophrases = noStopwordInput;
    var pseudophrases = stemmedInput;

    return pseudophrases;
  }
};
