import React from "react";
import "./RecipeTab.css";

export default function RecipeTab({
  recipes,
  editingLine,
  setEditingLine,
  toggleStatus,
  handleRecipeChange,
}) {
  return (
    <div className="som-recipe-master-view">
      {[1, 2, 3, 4].map((lineNum) => (
        <div key={lineNum} className="som-recipe-panel">
          <div className="som-recipe-panel-header">
            <span>LINE {lineNum} RECIPE</span>
            <div className="som-recipe-panel-stats">
              <span>Total: 45m</span>
            </div>
          </div>
          <div className="som-recipe-dense-table">
            <table className="som-ultra-table">
              <thead>
                <tr>
                  <th rowSpan="2">S</th>
                  <th rowSpan="2">VALVE</th>
                  <th rowSpan="2">INL</th>
                  <th rowSpan="2">EXH</th>
                  <th rowSpan="2">CON</th>
                  <th colSpan="2">PRESS</th>
                  <th rowSpan="2">NRM</th>
                  <th rowSpan="2">UNF</th>
                  <th rowSpan="2">WET</th>
                </tr>
                <tr>
                  <th>V</th>
                  <th>M</th>
                </tr>
              </thead>
              <tbody>
                {recipes[lineNum].map((r, idx) => {
                  const isEditing = editingLine === lineNum;
                  return (
                    <tr key={r.step}>
                      <td className="som-n">{r.step}</td>
                      <td className="som-tiny-txt" style={{ fontWeight: "800" }}>
                        MODULATE
                      </td>
                      <td onClick={() => toggleStatus(lineNum, idx, "inl")}>
                        <div className={`som-rect-status ${r.inl ? "open" : "close"} ${isEditing ? "som-editable" : ""}`}>
                          {r.inl ? "OPEN" : "CLOSE"}
                        </div>
                      </td>
                      <td onClick={() => toggleStatus(lineNum, idx, "exh")}>
                        <div className={`som-rect-status ${r.exh ? "open" : "close"} ${isEditing ? "som-editable" : ""}`}>
                          {r.exh ? "OPEN" : "CLOSE"}
                        </div>
                      </td>
                      <td onClick={() => toggleStatus(lineNum, idx, "con")}>
                        <div className={`som-rect-status ${r.con ? "open" : "close"} ${isEditing ? "som-editable" : ""}`}>
                          {r.con ? "OPEN" : "CLOSE"}
                        </div>
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="som-recipe-input"
                            value={r.bar}
                            onChange={(e) => handleRecipeChange(lineNum, idx, "bar", e.target.value)}
                          />
                        ) : (
                          <span className="som-val">{r.bar}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            className="som-recipe-select-tiny"
                            value={r.mode}
                            onChange={(e) => handleRecipeChange(lineNum, idx, "mode", e.target.value)}
                          >
                            <option value="OFF">OFF</option>
                            <option value="LOW">LOW</option>
                            <option value="HIGH">HIGH</option>
                          </select>
                        ) : (
                          <div className={`som-rect-status mode-${r.mode.toLowerCase()}`}>
                            {r.mode === "OFF" ? "OFF" : r.mode}
                          </div>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="som-recipe-input"
                            value={r.nrm}
                            onChange={(e) => handleRecipeChange(lineNum, idx, "nrm", e.target.value)}
                          />
                        ) : (
                          <span className="som-val">{r.nrm}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="som-recipe-input"
                            value={r.unf}
                            onChange={(e) => handleRecipeChange(lineNum, idx, "unf", e.target.value)}
                          />
                        ) : (
                          <span className="som-val">{r.unf}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="som-recipe-input"
                            value={r.wet}
                            onChange={(e) => handleRecipeChange(lineNum, idx, "wet", e.target.value)}
                          />
                        ) : (
                          <span className="som-val">{r.wet}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="som-recipe-panel-footer">
            {editingLine === lineNum ? (
              <div className="som-edit-actions">
                <button className="som-mini-save-btn" onClick={() => setEditingLine(null)}>
                  SAVE
                </button>
                <button className="som-mini-cancel-btn" onClick={() => setEditingLine(null)}>
                  CANCEL
                </button>
              </div>
            ) : (
              <button className="som-mini-edit-btn" onClick={() => setEditingLine(lineNum)}>
                EDIT LINE {lineNum}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
