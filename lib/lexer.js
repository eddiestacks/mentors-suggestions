module.exports = {
  pseudoPhrase: function(input, stopwords) {
    if (input instanceof String) {
      console.log("Input must be String to convert pseudoPhrase");
      return false;
    }
    // Lowercase the given input 
    var lcaseInput = input.toLowerCase();
    // Remove some non-alphabetical characters (numbers and punctuation)
    // Strip the lowercase string of numbers and periods followed by a space
    var noNumberInput = lcaseInput.split(/\d*\.\d+|\d+|(\. )/g).join(" ");
    // Strip punctuation. (second replace handles periods and accounts for acronmyms)
    var noPunctuationInput = noNumberInput.replace(/[\,\?\!\*\:\&\$]/ig, " ").replace(/\./ig, "");

    // Tokenize on whitespace and return an array of non-empty strings
    var tokenizedInput = _.filter(noPunctuationInput.split(/\s/), function(token) {
      return token.length > 0;
    });

    // Strip out stop words 
    // var stopwords = this.renderTemplate('stopwords.exclusions').split(',');
    console.log("stopwords:");
    console.log(stopwords);
    var noStopwordInput = _.difference(tokenizedInput, stopwords);

    //todo: Implement porter2 stemming algorithm @sprint2
    // Return an array of pseudophrases
    return noStopwordInput;

  }
};
