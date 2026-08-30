import type {DictionaryResult, SaveLibraryVocabularyInput} from '../../api/contracts/library';

export function dictionaryWordToLibraryInput(result: DictionaryResult, selectedText: string): SaveLibraryVocabularyInput | null {
  const selected = selectedText.trim();
  const word = result.vocabulary?.[0];
  if (!result.available || !selected || !word?.fragment?.trim()) return null;
  return {
    word: word.fragment.trim(),
    phonetic: word.pronunciation ?? '',
    part_of_speech: word.pos ?? '',
    definition: word.meaning ?? '',
    translation_vi: '',
    source_fragment: selected,
    source_kind: 'dictionary',
    focus_note: result.summary ?? '',
  };
}
