// Compatibilidade: a implementacao compartilhada evita regras diferentes entre
// o Copiloto neuropsicologico e os demais recursos clinicos de IA.
export {
  redactDirectIdentifiers,
  redactKnownPersonName as redactPatientName,
  pseudonymizeClinicalText as sanitizeClinicalText,
} from '../../common/privacy/clinical-text-pseudonymizer'
