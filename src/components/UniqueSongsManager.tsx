import React, { useEffect, useState } from 'react';
import { database } from '../lib/firebase';
import { ref, get, set, child } from 'firebase/database';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, X, Pencil, Trash2, Save, XCircle } from 'lucide-react';

// Fallback data (in case Firebase is empty)
const fallbackSongs = [
  { title: "a mighty fortress is our god", link1: "", link2: "" },
  { title: "all creatures of our god and king", link1: "", link2: "" },
  { title: "all hail the power of jesus' name", link1: "", link2: "" },
  { title: "ancient of days", link1: "", link2: "" },
  { title: "before the throne of god above", link1: "", link2: "" },
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
  const [newSong, setNewSong] = useState({ title: '', link1: '', link2: '' });
  const [addingSong, setAddingSong] = useState(false);
  const [search, setSearch] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState({ title: '', link1: '', link2: '' });
  const [showDeleteIdx, setShowDeleteIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, 'uniqueSongs'));
        if (snapshot.exists()) {
          // Data is an object keyed by slug, convert to array
          const data = snapshot.val() as Record<string, { title: string; link1: string; link2: string }>;
          const loaded = Object.entries(data).map(([slug, value]) => ({ title: value.title || slug, link1: value.link1, link2: value.link2 }));
          setSongs(loaded);
        } else {
          setSongs(fallbackSongs);
        }
      } catch (e) {
        setSongs(fallbackSongs);
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  const handleChange = (idx, field, value) => {
    setSongs(songs => songs.map((song, i) => i === idx ? { ...song, [field]: value } : song));
  };

  const handleSave = async (idx) => {
    const song = songs[idx];
    setSaving(s => ({ ...s, [idx]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(song.title)}`), {
        title: song.title,
        link1: song.link1,
        link2: song.link2,
      });
    } finally {
      setSaving(s => ({ ...s, [idx]: false }));
    }
  };

  const handleDelete = async (idx) => {
    const song = songs[idx];
    setSaving(s => ({ ...s, [idx]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(song.title)}`), null);
      setSongs(songs => songs.filter((_, i) => i !== idx));
    } finally {
      setSaving(s => ({ ...s, [idx]: false }));
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
          link1: song.link1 || '',
          link2: song.link2 || ''
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
        link1: newSong.link1.trim(),
        link2: newSong.link2.trim()
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
      setNewSong({ title: '', link1: '', link2: '' });
      setShowAddForm(false);
    } catch (error) {
      alert('Error adding song: ' + error.message);
    } finally {
      setAddingSong(false);
    }
  };

  const handleCancelAdd = () => {
    setNewSong({ title: '', link1: '', link2: '' });
    setShowAddForm(false);
  };

  // Filtered songs based on search
  const filteredSongs = songs.filter(song => {
    const q = search.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      (song.link1 && song.link1.toLowerCase().includes(q)) ||
      (song.link2 && song.link2.toLowerCase().includes(q))
    );
  });

  // Start editing a song
  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditBuffer({ ...filteredSongs[idx] });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingIdx(null);
    setEditBuffer({ title: '', link1: '', link2: '' });
  };

  // Save edit
  const saveEdit = async (idx: number) => {
    setSaving(s => ({ ...s, [idx]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(editBuffer.title)}`), {
        title: editBuffer.title,
        link1: editBuffer.link1,
        link2: editBuffer.link2,
      });
      setSongs(songs => songs.map((song, i) => i === idx ? { ...editBuffer } : song));
      setEditingIdx(null);
    } finally {
      setSaving(s => ({ ...s, [idx]: false }));
    }
  };

  // Confirm delete
  const confirmDelete = async (idx: number) => {
    setSaving(s => ({ ...s, [idx]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(songs[idx].title)}`), null);
      setSongs(songs => songs.filter((_, i) => i !== idx));
      setShowDeleteIdx(null);
    } finally {
      setSaving(s => ({ ...s, [idx]: false }));
    }
  };

  if (loading) return <div>Loading songs...</div>;

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Songs & Links</CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="default" 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Song
            </Button>
            <label htmlFor="import-songs-json">
              <Button asChild size="sm" variant="outline" disabled={importing}>
                <span>{importing ? 'Importing...' : 'Import JSON'}</span>
              </Button>
              <input
                id="import-songs-json"
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleImport}
                disabled={importing}
              />
            </label>
            <Button size="sm" variant="outline" onClick={handleExport}>
              Export JSON
            </Button>
          </div>
        </div>
        {/* Search Bar */}
        <div className="mt-4">
          <Input
            placeholder="Search songs by title or link..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
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
            <div key={song.title} className="p-4 border rounded-lg bg-gray-50 flex flex-col md:flex-row md:items-stretch gap-2">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="font-semibold mb-1">{toTitleCase(song.title)}</div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      placeholder="Link 1 (e.g. YouTube, Chord Sheet)"
                      value={editingIdx === idx ? editBuffer.link1 : song.link1}
                      onChange={e => setEditBuffer(buf => ({ ...buf, link1: e.target.value }))}
                      disabled={editingIdx !== idx}
                    />
                    <Input
                      placeholder="Link 2 (optional)"
                      value={editingIdx === idx ? editBuffer.link2 : song.link2}
                      onChange={e => setEditBuffer(buf => ({ ...buf, link2: e.target.value }))}
                      disabled={editingIdx !== idx}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-row md:flex-col gap-2 md:justify-end md:items-end mt-2 md:mt-0">
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