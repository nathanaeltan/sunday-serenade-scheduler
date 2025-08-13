import React, { useEffect, useState } from 'react';
import { database } from '../lib/firebase';
import { ref, get, set, child } from 'firebase/database';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, X, Pencil, Trash2, Save, XCircle, Link as LinkIcon, FileText } from 'lucide-react';

// Fallback data (in case Firebase is empty)
const fallbackSongs = [
  { title: "a mighty fortress is our god", link1: "", link2: "", lyrics: "" },
  { title: "all creatures of our god and king", link1: "", link2: "", lyrics: "" },
  { title: "all hail the power of jesus' name", link1: "", link2: "", lyrics: "" },
  { title: "ancient of days", link1: "", link2: "", lyrics: "" },
  { title: "before the throne of god above", link1: "", link2: "", lyrics: "" },
  // ... (add the rest or import from JSON if needed)
];

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Utility: Advanced Title Case
function toTitleCase(str) {
  const minorWords = [
    "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "so", "the", "to", "up", "yet"
  ];
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i, arr) => {
      if (
        minorWords.includes(word) &&
        i !== 0 &&
        i !== arr.length - 1
      ) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export default function UniqueSongsManager() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', artist: '', link1: '', link2: '', lyrics: '', spotify: '' });
  const [addingSong, setAddingSong] = useState(false);
  const [search, setSearch] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState({ title: '', artist: '', link1: '', link2: '', lyrics: '', spotify: '' });
  const [showDeleteIdx, setShowDeleteIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, 'uniqueSongs'));
        if (snapshot.exists()) {
          // Data is an object keyed by slug, convert to array
          const data = snapshot.val() as Record<string, { title: string; artist?: string; link1: string; link2: string; lyrics?: string; spotify?: string }>;
          const loaded = Object.entries(data).map(([slug, value]) => ({
            title: value.title || slug,
            artist: value.artist || '',
            link1: value.link1,
            link2: value.link2,
            lyrics: value.lyrics || '',
            spotify: value.spotify || ''
          }));
          setSongs(loaded);
        } else {
          setSongs(fallbackSongs.map(song => ({ ...song, artist: '', spotify: '' })));
        }
      } catch (e) {
        setSongs(fallbackSongs.map(song => ({ ...song, artist: '', spotify: '' })));
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  const handleChange = (idx, field, value) => {
    const filteredSong = filteredSongs[idx];
    const originalIndex = songs.findIndex(song => song.title === filteredSong.title);
    
    if (originalIndex === -1) {
      console.error('Could not find original song');
      return;
    }
    
    setSongs(songs => songs.map((song, i) => i === originalIndex ? { ...song, [field]: value } : song));
  };

  const handleSave = async (idx) => {
    const song = songs[idx];
    setSaving(s => ({ ...s, [idx]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(song.title)}`), {
        title: song.title,
        artist: song.artist,
        link1: song.link1,
        link2: song.link2,
        lyrics: song.lyrics,
        spotify: song.spotify,
      });
    } finally {
      setSaving(s => ({ ...s, [idx]: false }));
    }
  };

  const handleDelete = async (idx) => {
    const filteredSong = filteredSongs[idx];
    const originalIndex = songs.findIndex(song => song.title === filteredSong.title);
    
    if (originalIndex === -1) {
      console.error('Could not find original song');
      return;
    }
    
    setSaving(s => ({ ...s, [originalIndex]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(filteredSong.title)}`), null);
      setSongs(songs => songs.filter((_, i) => i !== originalIndex));
    } finally {
      setSaving(s => ({ ...s, [originalIndex]: false }));
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    try {
      const text = await file.text();
      const importedArray = JSON.parse(text);
      // Slugify and transform
      const songsObj = {};
      importedArray.forEach(song => {
        const slug = slugify(song.title);
        songsObj[slug] = {
          title: song.title,
          artist: song.artist || '',
          link1: song.link1 || '',
          link2: song.link2 || '',
          lyrics: song.lyrics || '',
          spotify: song.spotify || ''
        };
      });
      await set(ref(database, 'uniqueSongs'), songsObj);
      setImportMessage('Successfully imported songs!');
      // Update local state
      setSongs(importedArray);
    } catch (err) {
      setImportMessage('Error importing songs: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Export songs as JSON file
  const handleExport = () => {
    const dataStr = JSON.stringify(songs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unique_songs.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddSong = async () => {
    if (!newSong.title.trim()) {
      alert('Please enter a song title');
      return;
    }

    setAddingSong(true);
    try {
      const songToAdd = {
        title: newSong.title.trim().toLowerCase(),
        artist: newSong.artist.trim(),
        link1: newSong.link1.trim(),
        link2: newSong.link2.trim(),
        lyrics: newSong.lyrics.trim(),
        spotify: newSong.spotify.trim(),
      };

      // Check if song already exists
      const existingSong = songs.find(song => song.title.toLowerCase() === songToAdd.title);
      if (existingSong) {
        alert('A song with this title already exists');
        return;
      }

      // Add to Firebase
      await set(ref(database, `uniqueSongs/${slugify(songToAdd.title)}`), songToAdd);
      
      // Update local state
      setSongs(prevSongs => [...prevSongs, songToAdd]);
      
      // Reset form
      setNewSong({ title: '', artist: '', link1: '', link2: '', lyrics: '', spotify: '' });
      setShowAddForm(false);
    } catch (error) {
      alert('Error adding song: ' + error.message);
    } finally {
      setAddingSong(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewSong({ title: '', artist: '', link1: '', link2: '', lyrics: '', spotify: '' });
  };

  const startEdit = (idx) => {
    const song = filteredSongs[idx];
    setEditingIdx(idx);
    setEditBuffer({
      title: song.title,
      artist: song.artist,
      link1: song.link1,
      link2: song.link2,
      lyrics: song.lyrics,
      spotify: song.spotify,
    });
  };

  const saveEdit = async (idx) => {
    // Find the actual song in the original songs array by title
    const filteredSong = filteredSongs[idx];
    const originalIndex = songs.findIndex(song => song.title === filteredSong.title);
    
    if (originalIndex === -1) {
      console.error('Could not find original song');
      return;
    }
    
    const updatedSong = { ...filteredSong, ...editBuffer };
    
    // Update the original songs array
    setSongs(songs => songs.map((song, i) => i === originalIndex ? updatedSong : song));
    setEditingIdx(null);
    
    // Save the updated song directly to Firebase
    setSaving(s => ({ ...s, [originalIndex]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(updatedSong.title)}`), {
        title: updatedSong.title,
        artist: updatedSong.artist,
        link1: updatedSong.link1,
        link2: updatedSong.link2,
        lyrics: updatedSong.lyrics,
        spotify: updatedSong.spotify,
      });
    } finally {
      setSaving(s => ({ ...s, [originalIndex]: false }));
    }
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditBuffer({ title: '', artist: '', link1: '', link2: '', lyrics: '', spotify: '' });
  };

  const confirmDelete = async (idx) => {
    await handleDelete(idx);
    setShowDeleteIdx(null);
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(search.toLowerCase()) ||
    song.artist.toLowerCase().includes(search.toLowerCase()) ||
    song.link1.toLowerCase().includes(search.toLowerCase()) ||
    song.link2.toLowerCase().includes(search.toLowerCase()) ||
    song.lyrics.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading songs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Songs & Links</CardTitle>
            <p className="text-gray-600 mt-1">Manage your song library with links to chords, lyrics, and streaming</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              + Add Song
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => document.getElementById('import-input')?.click()}>
                Import JSON
              </Button>
              <Button variant="outline" onClick={handleExport}>
                Export JSON
              </Button>
            </div>
          </div>
        </div>
        <input
          id="import-input"
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
        <Input
          placeholder="Search songs by title, artist, or link..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mt-2"
        />
        {importMessage && (
          <div className={`mt-2 text-sm ${importMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{importMessage}</div>
        )}
      </CardHeader>
      <CardContent>
        {/* Add Song Form */}
        {showAddForm && (
          <div className="mb-6 p-4 border rounded-lg bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-blue-900">Add New Song</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAdd}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Song Title *
                </label>
                <Input
                  placeholder="Enter song title"
                  value={newSong.title}
                  onChange={e => setNewSong(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Artist
                </label>
                <Input
                  placeholder="Enter artist name"
                  value={newSong.artist}
                  onChange={e => setNewSong(prev => ({ ...prev, artist: e.target.value }))}
                  className="bg-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Link 1 (e.g. YouTube, Chord Sheet)
                  </label>
                  <Input
                    placeholder="Optional link"
                    value={newSong.link1}
                    onChange={e => setNewSong(prev => ({ ...prev, link1: e.target.value }))}
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Link 2 (optional)
                  </label>
                  <Input
                    placeholder="Optional second link"
                    value={newSong.link2}
                    onChange={e => setNewSong(prev => ({ ...prev, link2: e.target.value }))}
                    className="bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Lyrics URL (optional)
                </label>
                <Input
                  placeholder="https://example.com/lyrics..."
                  value={newSong.lyrics}
                  onChange={e => setNewSong(prev => ({ ...prev, lyrics: e.target.value }))}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Spotify Link (optional)
                </label>
                <Input
                  placeholder="https://open.spotify.com/track/..."
                  value={newSong.spotify}
                  onChange={e => setNewSong(prev => ({ ...prev, spotify: e.target.value }))}
                  className="bg-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleAddSong}
                  disabled={addingSong || !newSong.title.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {addingSong ? 'Adding...' : 'Add Song'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelAdd}
                  disabled={addingSong}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filteredSongs.map((song, idx) => (
            <div key={song.title} className="p-4 border rounded-lg bg-gray-50 flex flex-col md:flex-row md:items-start gap-2">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="font-semibold mb-1">{toTitleCase(song.title)}</div>
                  {song.artist && (
                    <div className="text-xs text-gray-600 mb-1">Artist: {song.artist}</div>
                  )}
                  <div className="flex flex-col md:flex-row gap-2 items-center">
                    <div className="flex-1 flex flex-col md:flex-row gap-2 w-full">
                      {editingIdx === idx ? (
                        <Input
                          placeholder="Link 1 (e.g. YouTube, Chord Sheet)"
                          value={editBuffer.link1}
                          onChange={e => setEditBuffer(buf => ({ ...buf, link1: e.target.value }))}
                          disabled={editingIdx !== idx}
                        />
                      ) : (
                        song.link1 && song.link1.startsWith('http') ? (
                          <Button asChild variant="outline" size="sm">
                            <a href={song.link1} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4" />
                              Chords
                            </a>
                          </Button>
                        ) : (
                          <div className="text-sm text-gray-500 h-9 flex items-center px-3">{song.link1 || 'No Chords Link'}</div>
                        )
                      )}
                      {editingIdx === idx ? (
                        <Input
                          placeholder="Link 2 (optional)"
                          value={editBuffer.link2}
                          onChange={e => setEditBuffer(buf => ({ ...buf, link2: e.target.value }))}
                          disabled={editingIdx !== idx}
                        />
                      ) : (
                        song.link2 && song.link2.startsWith('http') ? (
                          <Button asChild variant="outline" size="sm">
                            <a href={song.link2} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4" />
                              Link 2
                            </a>
                          </Button>
                        ) : (
                          <div className="text-sm text-gray-500 h-9 flex items-center px-3">{song.link2 || 'No Second Link'}</div>
                        )
                      )}
                    </div>
                    <div className="hidden md:block">
                      {editingIdx === idx ? (
                        <Button
                          onClick={() => saveEdit(idx)}
                          disabled={saving[idx]}
                          className="w-10 h-10 flex items-center justify-center"
                          variant="default"
                        >
                          <Save className="w-5 h-5" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => startEdit(idx)}
                          className="w-10 h-10 flex items-center justify-center"
                          variant="outline"
                        >
                          <Pencil className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 mt-2 items-center">
                    <div className="flex-1 flex flex-col md:flex-row gap-2 w-full">
                      {editingIdx === idx && (
                        <Input
                          placeholder="Artist"
                          value={editBuffer.artist}
                          onChange={e => setEditBuffer(buf => ({ ...buf, artist: e.target.value }))}
                        />
                      )}
                      {editingIdx === idx ? (
                        <Input
                          placeholder="Lyrics URL (optional)"
                          value={editBuffer.lyrics}
                          onChange={e => setEditBuffer(buf => ({ ...buf, lyrics: e.target.value }))}
                          disabled={editingIdx !== idx}
                        />
                      ) : (
                        song.lyrics && song.lyrics.startsWith('http') ? (
                          <Button asChild variant="outline" size="sm">
                            <a href={song.lyrics} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Lyrics
                            </a>
                          </Button>
                        ) : (
                          <div className="text-sm text-gray-500 h-9 flex items-center px-3">{song.lyrics || 'No Lyrics Link'}</div>
                        )
                      )}
                      {editingIdx === idx ? (
                        <Input
                          placeholder="Spotify Link (optional)"
                          value={editBuffer.spotify}
                          onChange={e => setEditBuffer(buf => ({ ...buf, spotify: e.target.value }))}
                          disabled={editingIdx !== idx}
                        />
                      ) : (
                        song.spotify && song.spotify.startsWith('http') ? (
                          <a href={song.spotify} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center gap-1.5 py-2 px-3 rounded-md border bg-white hover:bg-gray-50 h-9">
                            <svg width="16" height="16" viewBox="0 0 168 168" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="84" cy="84" r="84" fill="#1ED760"/><path d="M122.1 116.2c-2.1 3.4-6.5 4.5-9.9 2.4-27.1-16.6-61.3-20.4-101.7-11.2-3.9.9-7.8-1.5-8.7-5.4-.9-3.9 1.5-7.8 5.4-8.7 43.2-9.7 80.1-5.6 110.1 12.2 3.4 2.1 4.5 6.5 2.4 9.9zm13.9-25.6c-2.6 4.2-8.1 5.6-12.3 3-31.1-19-78.5-24.6-115.2-13.5-4.7 1.4-9.7-1.2-11.1-5.9-1.4-4.7 1.2-9.7 5.9-11.1 41.7-12.2 93.2-6.1 128.2 15.1 4.2 2.6 5.6 8.1 3 12.4zm14.1-28.1c-36.2-21.5-96.2-23.5-130.2-12.9-5.3 1.6-10.9-1.3-12.5-6.6-1.6-5.3 1.3-10.9 6.6-12.5 37.2-11.3 102.6-9.1 143.2 14.1 5 3 6.6 9.5 3.6 14.5-3 5-9.5 6.6-14.5 3.6z" fill="#fff"/></svg>
                            Spotify
                          </a>
                        ) : (
                          <div className="text-sm text-gray-500 h-9 flex items-center px-3">{song.spotify || 'No Spotify Link'}</div>
                        )
                      )}
                    </div>
                    <div className="hidden md:block">
                      {editingIdx === idx ? (
                        <Button
                          onClick={cancelEdit}
                          className="w-10 h-10 flex items-center justify-center"
                          variant="outline"
                        >
                          <XCircle className="w-5 h-5" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setShowDeleteIdx(idx)}
                          className="w-10 h-10 flex items-center justify-center"
                          variant="destructive"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Mobile buttons */}
                  <div className="flex flex-row gap-2 mt-2 md:hidden">
                    {editingIdx === idx ? (
                      <>
                        <Button
                          onClick={() => saveEdit(idx)}
                          disabled={saving[idx]}
                          className="w-10 h-10 flex items-center justify-center"
                          variant="default"
                        >
                          <Save className="w-5 h-5" />
                        </Button>
                        <Button
                          onClick={cancelEdit}
                          className="w-10 h-10 flex items-center justify-center"
                          variant="outline"
                        >
                          <XCircle className="w-5 h-5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => startEdit(idx)}
                          className="w-10 h-10 flex items-center justify-center"
                          variant="outline"
                        >
                          <Pencil className="w-5 h-5" />
                        </Button>
                        <Button
                          onClick={() => setShowDeleteIdx(idx)}
                          className="w-10 h-10 flex items-center justify-center"
                          variant="destructive"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* Delete confirmation dialog */}
              {showDeleteIdx === idx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                  <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
                    <div className="mb-4 font-semibold text-lg">Delete Song?</div>
                    <div className="mb-4 text-gray-700">Are you sure you want to delete <span className="font-bold">{toTitleCase(song.title)}</span>?</div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowDeleteIdx(null)}>Cancel</Button>
                      <Button variant="destructive" onClick={() => confirmDelete(idx)} disabled={saving[idx]}>Delete</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 